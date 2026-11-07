import bpy, math, sys
from mathutils import Vector

OUT = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/home/claude/render/fresnel.png'
R = math.radians

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 96
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 1000
sc.view_settings.view_transform = 'AgX'

# ---------- materiale ----------
def mat(name, base, metal, rough, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat
    return m

black  = mat('black',  (0.012, 0.013, 0.016), 0.55, 0.40, 0.25)
black2 = mat('black2', (0.020, 0.021, 0.025), 0.30, 0.62)
alu    = mat('alu',    (0.62, 0.63, 0.65), 1.0, 0.28)
rubber = mat('rubber', (0.008, 0.008, 0.008), 0.0, 0.85)

lens = bpy.data.materials.new('lens'); lens.use_nodes = True
nt = lens.node_tree; N = nt.nodes; L = nt.links; N.clear()
out = N.new('ShaderNodeOutputMaterial')
em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.80, 0.52, 1)
tc = N.new('ShaderNodeTexCoord')
wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'RINGS'
wv.inputs['Scale'].default_value = 24; wv.inputs['Distortion'].default_value = 0
L.new(tc.outputs['Object'], wv.inputs['Vector'])
mr = N.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 25; mr.inputs['To Max'].default_value = 60
L.new(wv.outputs['Fac'], mr.inputs['Value']); L.new(mr.outputs['Result'], em.inputs['Strength'])
gl = N.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.05
ad = N.new('ShaderNodeAddShader')
L.new(em.outputs[0], ad.inputs[0]); L.new(gl.outputs[0], ad.inputs[1]); L.new(ad.outputs[0], out.inputs['Surface'])

# ---------- ajutoare ----------
def fin(o, m, bevel=0.0025, smooth=True):
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 3; b.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        e = o.modifiers.new('es', 'EDGE_SPLIT'); e.split_angle = R(35)
    return o

def cyl(r, d, loc, rot=(0, 0, 0), v=72):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot)
    return bpy.context.object

def box(size, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return o

def tor(Rm, r, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=Rm, minor_radius=r, location=loc, rotation=rot,
                                     major_segments=96, minor_segments=14)
    return bpy.context.object

def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); e.location = loc; sc.collection.objects.link(e); return e

def parent(objs, p):
    for o in objs: o.parent = p

# ---------- capul reflectorului (axa Z = fața) ----------
head = []
head.append(fin(cyl(0.12, 0.30, (0, 0, 0)), black))
for z in (-0.10, -0.05, 0.0, 0.05, 0.10):
    head.append(fin(tor(0.1215, 0.0045, (0, 0, z)), black2, bevel=0))
head.append(fin(cyl(0.105, 0.04, (0, 0, -0.17)), black2))
head.append(fin(cyl(0.032, 0.035, (0, 0, -0.205)), alu))
head.append(fin(cyl(0.128, 0.022, (0, 0, 0.158)), black))
head.append(fin(tor(0.114, 0.012, (0, 0, 0.176)), black, bevel=0))
lo = cyl(0.104, 0.008, (0, 0, 0.174)); lo.data.materials.append(lens); head.append(lo)
for x in (-0.135, 0.135):
    head.append(fin(box((0.008, 0.27, 0.010), (x, 0, 0.183)), black2))
for y in (-0.15, 0.15):
    head.append(fin(box((0.312, 0.012, 0.012), (0, y, 0.19)), black))
for x in (-0.15, 0.15):
    head.append(fin(box((0.012, 0.312, 0.012), (x, 0, 0.19)), black))
a = R(35); Ld = 0.15
# clapete sus/jos (axa Y), stânga/dreapta (axa X)
head.append(fin(box((0.28, 0.004, Ld), (0, 0.15 + math.sin(a) * Ld / 2, 0.19 + math.cos(a) * Ld / 2), (-a, 0, 0)), black, bevel=0.0015))
head.append(fin(box((0.28, 0.004, Ld), (0, -0.15 - math.sin(a) * Ld / 2, 0.19 + math.cos(a) * Ld / 2), (a, 0, 0)), black, bevel=0.0015))
head.append(fin(box((0.004, 0.22, Ld), (0.15 + math.sin(a) * Ld / 2, 0, 0.19 + math.cos(a) * Ld / 2), (0, a, 0)), black, bevel=0.0015))
head.append(fin(box((0.004, 0.22, Ld), (-0.15 - math.sin(a) * Ld / 2, 0, 0.19 + math.cos(a) * Ld / 2), (0, -a, 0)), black, bevel=0.0015))
head.append(fin(tor(0.07, 0.008, (0, 0.12, 0), (0, R(90), 0)), black2, bevel=0))
for x in (-0.148, 0.148):
    head.append(fin(cyl(0.04, 0.02, (x, 0, 0), (0, R(90), 0)), black2))

# ---------- furca + baza ----------
yoke = []
for x in (-0.165, 0.165):
    yoke.append(fin(box((0.018, 0.06, 0.30), (x, 0, -0.14)), black))
    yoke.append(fin(cyl(0.032, 0.025, (x * 1.14, 0, 0), (0, R(90), 0)), alu))
    yoke.append(fin(box((0.012, 0.012, 0.07), (x * 1.22, 0, 0.0)), alu))
yoke.append(fin(box((0.348, 0.06, 0.018), (0, 0, -0.29)), black))
yoke.append(fin(cyl(0.022, 0.07, (0, 0, -0.33)), black))
yoke.append(fin(box((0.40, 0.30, 0.022), (0, 0, -0.37)), black, bevel=0.008))
for x in (-0.17, 0.17):
    for y in (-0.12, 0.12):
        yoke.append(fin(cyl(0.02, 0.01, (x, y, -0.386)), rubber, bevel=0.002))

root = empty('root', (0, 0, 0.391))
hd = empty('head')
hd.parent = root
parent(yoke, root); parent(head, hd)

# lumina din lentilă
bpy.ops.object.light_add(type='SPOT', location=(0, 0, 0.19))
sp = bpy.context.object; sp.parent = hd; sp.rotation_euler = (R(180), 0, 0)
sp.data.energy = 400; sp.data.spot_size = R(110); sp.data.spot_blend = 0.5
sp.data.color = (1.0, 0.85, 0.6); sp.data.shadow_soft_size = 0.08

# orientare: înclinat spre cameră, apoi rotit spre dreapta (reflector în colțul stâng)
hd.rotation_euler = (R(58), 0, 0)
root.rotation_euler = (0, 0, R(65))

# ---------- podea (doar umbra) ----------
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
bpy.context.object.is_shadow_catcher = True

# ---------- lumini de studio ----------
def look(o, target):
    d = Vector(target) - o.location
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def area(loc, color, energy, size):
    bpy.ops.object.light_add(type='AREA', location=loc)
    l = bpy.context.object; l.data.energy = energy; l.data.size = size; l.data.color = color
    look(l, (0, 0, 0.4)); return l

area((0.9, 1.0, 1.1), (0.5, 0.62, 1.0), 90, 1.2)    # contur rece, din spate
area((-1.2, -1.0, 1.0), (0.85, 0.9, 1.0), 22, 1.5)  # lumină slabă din față
area((0.6, 0.3, 1.8), (1.0, 0.82, 0.55), 60, 1.5)   # reflexia caldă de pe perete

w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.010, 0.016, 0.040, 1)

# ---------- camera ----------
cam = bpy.data.cameras.new('cam'); cam.lens = 70
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -2.3, 1.25); look(co, (0, 0, 0.32))

sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('DONE', OUT)
