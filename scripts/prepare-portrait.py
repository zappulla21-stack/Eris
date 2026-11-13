"""Generate registered depth/animation masks for the 740px Eris reference.

R: estimated relief, G: hair mobility, B: opaque portrait silhouette.
This is an artistic depth estimate, not a reconstructed 3D scan.
Uses only Python's standard library. Run from the repository root.
"""
import math
import struct
import zlib
from pathlib import Path

SIZE = 740

def smooth(a, b, x):
    t = min(1, max(0, (x-a)/(b-a)))
    return t*t*(3-2*t)

def gaussian(x, y, cx, cy, sx, sy):
    return math.exp(-(((x-cx)/sx)**2 + ((y-cy)/sy)**2)*2)

# Photo coordinates, measured from the upper left.
outline = [(0,.70),(0,1),(.71,1),(.70,.91),(.60,.79),(.58,.72),
           (.67,.705),(.71,.66),(.732,.61),(.737,.57),(.733,.548),
           (.761,.532),(.775,.501),(.759,.45),(.749,.421),(.760,.365),
           (.758,.29),(.72,.17),(.65,.10),(.52,.08),(.43,.10),
           (.36,.17),(.29,.27),(.31,.42),(.35,.56),(.28,.65),(.18,.69)]

def inside(x, y):
    result = False
    j = len(outline)-1
    for i, (xi, yi) in enumerate(outline):
        xj, yj = outline[j]
        if (yi > y) != (yj > y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi:
            result = not result
        j = i
    return result

rows = bytearray()
for iy in range(SIZE):
    rows.append(0)  # PNG row filter
    y = iy/(SIZE-1)
    for ix in range(SIZE):
        x = ix/(SIZE-1)
        solid = float(inside(x,y))
        face = gaussian(x,y,.606,.386,.225,.37)
        neck = gaussian(x,y,.47,.77,.18,.32)
        temple = gaussian(x,y,.405,.27,.14,.16)
        nose = gaussian(x,y,.742,.496,.052,.084)
        cheek = gaussian(x,y,.626,.505,.105,.12)
        shoulder = gaussian(x,y,.25,.97,.36,.16)
        depth = min(1,.06 + face*.64 + neck*.37 + temple*.20 + nose*.30 + cheek*.10 + shoulder*.17)
        boundary = .40+.18*math.exp(-((y-.11)/.19)**2)-.07*math.exp(-((y-.53)/.20)**2)
        hair = (1-smooth(boundary-.075,boundary+.035,x))*(1-smooth(.55,.75,y))
        anchor = gaussian(x,y,.397,.265,.13,.14)
        hair *= 1-min(1,anchor*1.8)
        # Vary the depth of the loose strands behind the silhouette.
        depth = depth*(1-hair*.6)+hair*(.07+.045*math.sin(y*27+x*8))
        rows.extend((round(depth*255),round(hair*255),round(solid*255),255))

def chunk(kind, data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)

png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',SIZE,SIZE,8,6,0,0,0))
png += chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
Path('public/assets/eris-relief.png').write_bytes(png)
print('Generated registered relief and hair masks (740 x 740).')
