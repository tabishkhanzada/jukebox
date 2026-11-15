# co2_scan.py
# Kya hota hai: CO2 video ki har tasveer ko left->right 32 patliyon mein baanta jata hai. Har pixel ke rang se CO2 ka number:
# sunehri dhundh = kam se darmiyana, narangi/laal tukde = zyada, safed (barf) aur kala (space) = ginti mein nahi.
# Khadi line left se right chalti hai (4 s). Jahan line hai wahan ki awaz: "CO2 Hum" (gehri bhaari hum, dhundh jitni ghani utni zor) +
# "chatchat" (angare jaisi halki awaz) narangi/laal tukdon par. Koi music nahi. Rang aur gehrapan par awaz, movement par nahi.
import numpy as np, glob
from PIL import Image
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile
from co2_rule import co2
SR=44100; STEP=.25; P=4.0; COLS=32
files=sorted(glob.glob("f_*.png")); N=len(files); T=N*STEP; L=int(T*SR)
amt=np.zeros((N,COLS)); hotf=np.zeros((N,COLS))
for i,f in enumerate(files):
    rgb=np.asarray(Image.open(f).convert("RGB")).astype(float); val,hot=co2(rgb)
    w=val.shape[1]//COLS
    for c in range(COLS):
        amt[i,c]=val[:,c*w:(c+1)*w].mean(); hotf[i,c]=hot[:,c*w:(c+1)*w].mean()
def norm(a): hi=np.percentile(a,98); return np.clip(a/hi,0,1) if hi>0 else a
A=norm(amt); H=norm(hotf); np.save("co2_amt.npy",A); np.save("co2_hot.npy",H)
def filt(x,k,fc,o=2):
    b,a=butter(o,fc,btype=k,fs=SR); return lfilter(b,a,x)
tt=np.arange(L)/SR; x=(tt%P)/P
fi=np.clip(tt/STEP-.5,0,N-1.001); i0=fi.astype(int); fr=fi-i0; i1=np.minimum(i0+1,N-1)
ci=np.clip(x*COLS-.5,0,COLS-1.001); c0=ci.astype(int); cf=ci-c0
def samp(M): return np.clip(filt(((M[i0,c0]*(1-cf)+M[i0,c0+1]*cf)*(1-fr)+(M[i1,c0]*(1-cf)+M[i1,c0+1]*cf)*fr),"low",5,1),0,1)
a=samp(A); hh=samp(H)
rng=np.random.default_rng(5)
# CO2 Hum v2: narm gehri gunj (rumble) + halki sureeli "oo" + halka hawa ka rang; chatchat narm aur kam
swell=np.clip(1+filt(rng.standard_normal(L),"low",.2,1)*2.5,.7,1.3)
rumble=filt(rng.standard_normal(L),"band",[70,450])*3.0*(.55*a**1.2)*swell
airy=filt(rng.standard_normal(L),"band",[300,900])*2.0*(.18*a**1.6)*swell
oo=(np.sin(2*np.pi*110*tt)+.6*np.sin(2*np.pi*165.7*tt))*(.10*a)
hum=rumble+airy+oo
rate=18*hh**1.5
imp=(rng.random(L)<rate/SR).astype(float)*rng.uniform(.4,1,L)
k=filt(rng.standard_normal(int(.01*SR)),"low",1800,1)*np.exp(-np.arange(int(.01*SR))/(.003*SR))
crack=fftconvolve(imp,k)[:L]*1.2
s=hum+crack
pan=-.9+1.8*x
mix=np.stack([s*np.cos((pan+1)*np.pi/4),s*np.sin((pan+1)*np.pi/4)],1)
for c in (0,1): mix[:,c]=filt(mix[:,c],"low",3500)
mix*=np.minimum(1,np.minimum(tt/1,(T-tt)/1))[:,None]; mix/=np.abs(mix).max()*1.1
wavfile.write("co2_hum2.wav",SR,(mix*32767).astype(np.int16))
sp=np.abs(np.fft.rfft(mix[:SR*10,0]))**2; f=np.fft.rfftfreq(SR*10,1/SR)
print("energy 150-1000Hz %:",round(100*sp[(f>150)&(f<1000)].sum()/sp.sum(),1),"| energy >3kHz %:",round(100*sp[f>3000].sum()/sp.sum(),2),"| <120Hz %:",round(100*sp[f<120].sum()/sp.sum(),1),"| peak",np.abs(mix).max().round(2))
print("CO2 amount, 8 map regions L->R:",A.reshape(N,8,4).mean((0,2)).round(2))
print("CO2 amount, per time quarter:",A[:N//4*4].reshape(4,-1,COLS).mean((1,2)).round(2))
print("hot patches, per time quarter:",H[:N//4*4].reshape(4,-1,COLS).mean((1,2)).round(2))
print("silent share of strips (amount<0.02):",round(float((A<.02).mean()*100),1),"%")
