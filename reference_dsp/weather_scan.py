# weather_scan.py
# Kya hota hai: wind video ki har tasveer ko left->right 32 patliyon mein baanta jata hai.
# Har pixel ke rang se hawa ki raftaar: gehra neela/kala = shaant, neela->firozi->hara->peela->narangi->laal = tez.
# (Zameen safed/grey hai, us par hawa ka rang nahi hota, isliye us ko ginti mein nahi lete.)
# Khadi line left se right chalti hai (4 s). Jahan line hai wahan ki hawa ki awaz: tez hawa = zor ki sansanahat + halki seeti + jhonke.
# Koi music nahi. Awaz neechi aur narm (unchi awaz bohat kam).
import numpy as np, glob, colorsys
from PIL import Image
from scipy.ndimage import median_filter
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile
SR=44100; STEP=.25; P=4.0; COLS=32
files=sorted(glob.glob("f_*.png")); N=len(files); T=N*STEP; L=int(T*SR)
def strength(rgb):                      # rgb: (H,W,3) 0..255  ->  (strength 0..1, valid mask)
    x=rgb/255.0; mx=x.max(2); mn=x.min(2); d=mx-mn
    s=np.where(mx>0,d/np.maximum(mx,1e-9),0)
    r,g,b=x[...,0],x[...,1],x[...,2]
    h=np.zeros_like(mx); m=d>1e-9
    rm=m&(mx==r); gm=m&(mx==g)&~rm; bm=m&~rm&~gm
    h[rm]=((g-b)[rm]/d[rm])%6; h[gm]=(b-r)[gm]/d[gm]+2; h[bm]=(r-g)[bm]/d[bm]+4
    h*=60
    st=np.clip(1-h/270,0,1)
    st=np.where(mx<0.28,0,st)           # bohat gehra = shaant
    valid=s>=0.30                       # safed/grey zameen ko chhor do
    valid|=mx<0.28                      # gehra samundar valid (shaant)
    return st,valid
cols=np.zeros((N,COLS))
for i,f in enumerate(files):
    rgb=np.asarray(Image.open(f).convert("RGB")).astype(float)
    rgb=np.stack([median_filter(rgb[...,c],size=3) for c in range(3)],2)
    st,valid=strength(rgb)
    valid[:30,:95]=False; valid[225:,:135]=False
    w=st.shape[1]//COLS
    for c in range(COLS):
        v=valid[:,c*w:(c+1)*w]; cols[i,c]=st[:,c*w:(c+1)*w][v].mean() if v.sum()>50 else 0
print("raw strength min/max",cols.min().round(3),cols.max().round(3))
lo,hi=np.percentile(cols,2),np.percentile(cols,98); cn=np.clip((cols-lo)/(hi-lo),0,1); np.save("wx_cols.npy",cn)
def filt(x,k,fc,o=2):
    b,a=butter(o,fc,btype=k,fs=SR); return lfilter(b,a,x)
tt=np.arange(L)/SR; x=(tt%P)/P
fi=np.clip(tt/STEP-.5,0,N-1.001); i0=fi.astype(int); fr=fi-i0; i1=np.minimum(i0+1,N-1)
ci=np.clip(x*COLS-.5,0,COLS-1.001); c0=ci.astype(int); cf=ci-c0
h=((cn[i0,c0]*(1-cf)+cn[i0,c0+1]*cf)*(1-fr)+(cn[i1,c0]*(1-cf)+cn[i1,c0+1]*cf)*fr)
h=np.clip(filt(h,"low",5,1),0,1)
rng=np.random.default_rng(11)
gust=np.clip(1+filt(rng.standard_normal(L),"low",.3,1)*2.2,.4,1.7)          # zor ke jhonke
whoosh=filt(filt(rng.standard_normal(L),"high",80),"low",600)*(.04+.5*h**1.3)*gust
mid=filt(rng.standard_normal(L),"band",[300,1100])*(.10*h**1.6)*gust
def whistle(fc): return filt(rng.standard_normal(L),"band",[fc*.93,fc*1.07],2)
w1=np.clip(1-np.abs(h-.25)/.3,0,1); w2=np.clip(1-np.abs(h-.55)/.3,0,1); w3=np.clip(1-np.abs(h-.85)/.3,0,1)
seeti=(whistle(450)*w1+whistle(700)*w2+whistle(1000)*w3)*(1.4*h**1.5)*np.clip(gust,.5,1.5)
calm=filt(rng.standard_normal(L),"low",500)*(.025*(1-h))
s=whoosh+mid+seeti+calm
pan=-.9+1.8*x
mix=np.stack([s*np.cos((pan+1)*np.pi/4),s*np.sin((pan+1)*np.pi/4)],1)
for c in (0,1): mix[:,c]=filt(mix[:,c],"low",3500)
mix*=np.minimum(1,np.minimum(tt/1,(T-tt)/1))[:,None]; mix/=np.abs(mix).max()*1.1
wavfile.write("weather_wind.wav",SR,(mix*32767).astype(np.int16))
sp=np.abs(np.fft.rfft(mix[:SR*10,0]))**2; f=np.fft.rfftfreq(SR*10,1/SR)
print("energy >3kHz %:",round(100*sp[f>3000].sum()/sp.sum(),2),"peak",np.abs(mix).max().round(2))
print("avg strength per map region (8 groups L->R):",cn.reshape(N,8,4).mean((0,2)).round(2))
print("avg strength per time quarter:",cn.reshape(4,-1,COLS).mean((1,2)).round(2))
