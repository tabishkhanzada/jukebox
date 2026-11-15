# co2_rule.py: pixel ke rang se CO2 ka number (0..1). Safed/grey (barf, zameen) aur kala (space) = ginti mein nahi.
import numpy as np
def hsv(rgb):
    x=rgb/255.0; mx=x.max(2); mn=x.min(2); d=mx-mn
    s=np.where(mx>0,d/np.maximum(mx,1e-9),0); r,g,b=x[...,0],x[...,1],x[...,2]
    h=np.zeros_like(mx); m=d>1e-9
    rm=m&(mx==r); gm=m&(mx==g)&~rm; bm=m&~rm&~gm
    h[rm]=((g-b)[rm]/d[rm])%6; h[gm]=(b-r)[gm]/d[gm]+2; h[bm]=(r-g)[bm]/d[bm]+4
    return h*60,s,mx
def co2(rgb):
    h,s,v=hsv(rgb)
    warm=(h<=60)|(h>=345)                           # sunehra se laal
    haze=warm&(s>=0.35)&(v>=0.12)                   # sunehri dhundh (kam se darmiyana)
    hot=warm&(s>=0.60)&(v>=0.70)&(h<=32)            # narangi/laal tukde (zyada)
    val=np.zeros_like(v)
    val[haze]=0.15+0.45*np.clip((v[haze]-0.12)/0.5,0,1)   # dhundh jitni roshan/ghani utni zyada
    val[hot]=0.65+0.35*np.clip(s[hot],0,1)
    return val,hot
