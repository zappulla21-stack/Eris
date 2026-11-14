"""Registered artistic depth and silhouette masks for the supplied frontal Eris.

Run from the repository root. No remote service or dependencies are needed.
R: sculpting depth; G: flexible peripheral filaments; B: solid silhouette.
"""
import math
import struct
import zlib
from pathlib import Path

SIZE = 933
# (image y, left x, right x), shared with the volume in avatar.js.
PROFILE = [(0,.345,.655),(.045,.30,.70),(.10,.275,.725),(.18,.255,.745),
 (.27,.24,.76),(.35,.225,.775),(.42,.222,.783),(.50,.235,.774),
 (.57,.25,.75),(.64,.285,.716),(.70,.33,.68),(.75,.337,.67),
 (.77,.34,.665),(.785,.34,.663),(.84,.347,.661),(.90,.325,.687),
 (.94,.275,.735),(.975,.16,.86),(1,.055,.95)]

def bounds(y):
    for (ya,la,ra),(yb,lb,rb) in zip(PROFILE,PROFILE[1:]):
        if ya <= y <= yb:
            t=(y-ya)/(yb-ya)
            return la+(lb-la)*t,ra+(rb-ra)*t
    return .5,.5

def smooth(a,b,x):
    t=min(1,max(0,(x-a)/(b-a)))
    return t*t*(3-2*t)

def g(x,y,cx,cy,sx,sy):
    return math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2)*2)

rows=bytearray()
for iy in range(SIZE):
    rows.append(0)
    y=iy/(SIZE-1)
    left,right=bounds(y)
    for ix in range(SIZE):
        x=ix/(SIZE-1)
        solid=float(left<=x<=right)
        depth=.12+.30*g(x,y,.5,.32,.29,.42)
        depth+=.49*g(x,y,.5,.47,.052,.15)+.28*g(x,y,.5,.535,.067,.05)
        depth+=.16*g(x,y,.5,.633,.12,.055)+.18*g(x,y,.5,.715,.14,.07)
        for side in [.365,.633]:
            depth-=.17*g(x,y,side,.385,.085,.052)
            depth+=.13*g(x,y,side,.48,.10,.085)
        distance=max(left-x,x-right,0)
        hair=(1-solid)*(1-smooth(.015,.105,distance))*(1-smooth(.76,.84,y))
        hair*=smooth(.07,.20,y)
        rows.extend((round(min(1,max(0,depth))*255),round(hair*255),round(solid*255),255))

def chunk(kind,data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',SIZE,SIZE,8,6,0,0,0))
png+=chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
Path('public/assets/eris-hologram-depth.png').write_bytes(png)
print('Generated depth and filament masks for the frontal reference.')
