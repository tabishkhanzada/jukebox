# video_scan_nature.py
# Kya hota hai: ek line video par left se right chalti hai (4 second mein ek chakkar).
# Line jis jagah par hai, SIRF us jagah ke dhuan ki awaz aati hai: gehra rang = tez hawa + khuradri awaz + dhool ki tik tik,
# halka rang = narm halki hawa. Awaz line ke saath left kaan se right kaan ki taraf jati hai. Koi music nahi.
import numpy as np, glob
from PIL import Image
from scipy.ndimage import median_filter
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile
SR=44100; STEP=.25; P=4.0; COLS=32
files=sorted(glob.glob("/home/claude/vid/f_*.png")); N=len(files); T=N*STEP; L=int(T*SR)
cols=np.zeros((N,COLS))
for i,f in enumerate(files):
    a=median_filter(np.asarray(Image.open(f).convert("L")).astype(float),size=3); hv=1-a/255
    m=np.ones_like(hv,bool); m[:30,:95]=False; m[225:,:135]=False
    w=hv.shape[1]//COLS
    for c in range(COLS): cols[i,c]=hv[:,c*w:(c+1)*w][m[:,c*w:(c+1)*w]].mean()
lo,hi=np.percentile(cols,2),np.percentile(cols,98); cn=np.clip((cols-lo)/(hi-lo),0,1)
np.save("scan_cols.npy",cn)
def filt(x,k,fc,o=2):
    b,a=butter(o,fc,btype=k,fs=SR); return lfilter(b,a,x)
tt=np.arange(L)/SR
x=(tt%P)/P                                        # line ki jagah 0..1
fi=np.clip(tt/STEP-.5,0,N-1.001); i0=fi.astype(int); fr=fi-i0
ci=np.clip(x*COLS-.5,0,COLS-1.001); c0=ci.astype(int); cf=ci-c0
def at(i,c): return cn[i,c]
h=((at(i0,c0)*(1-cf)+at(i0,c0+1)*cf)*(1-fr)+(at(np.minimum(i0+1,N-1),c0)*(1-cf)+at(np.minimum(i0+1,N-1),c0+1)*cf)*fr)
h=np.clip(filt(h,"low",5,1),0,1)
rng=np.random.default_rng(3)
gust=np.clip(1+filt(rng.standard_normal(L),"low",.25,1)*1.5,.6,1.4)
wind=filt(filt(rng.standard_normal(L),"high",120),"low",700)*(.05+.45*h**1.2)*gust
grit=filt(rng.standard_normal(L),"band",[700,2200])*(.15*h**2)*gust
air=filt(rng.standard_normal(L),"low",900)*(.03*(1-h))
imp=(rng.random(L)<30*h**2/SR).astype(float)
k=rng.standard_normal(int(.004*SR))*np.exp(-np.arange(int(.004*SR))/(.001*SR))
ticks=fftconvolve(imp,k)[:L]*.25
s=wind+grit+air+ticks
pan=-.9+1.8*x
mix=np.stack([s*np.cos((pan+1)*np.pi/4),s*np.sin((pan+1)*np.pi/4)],1)
for c in (0,1): mix[:,c]=filt(mix[:,c],"low",3500)
mix*=np.minimum(1,np.minimum(tt/1,(T-tt)/1))[:,None]; mix/=np.abs(mix).max()*1.1
wavfile.write("scan_nature.wav",SR,(mix*32767).astype(np.int16)); print("ok",T)
