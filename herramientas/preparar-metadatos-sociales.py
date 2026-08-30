#!/usr/bin/env python3
from pathlib import Path

from PIL import Image


RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'assets' / 'logo-aletea-violeta.png'
IMAGEN_SOCIAL = RAIZ / 'assets' / 'aletea-institucional-social-v3.png'
FAVICON = RAIZ / 'assets' / 'favicon-aletea.png'


def mezclar(a, b, proporcion):
    return tuple(round(a[i] * (1 - proporcion) + b[i] * proporcion) for i in range(3))


def quitar_componentes_pequenos(imagen, area_minima=2000):
    alpha = imagen.getchannel('A')
    pixeles = alpha.load()
    visitados = set()
    componentes = []
    for y in range(alpha.height):
        for x in range(alpha.width):
            if (x, y) in visitados or pixeles[x, y] == 0:
                continue
            componente = []
            pendientes = [(x, y)]
            visitados.add((x, y))
            while pendientes:
                actual = pendientes.pop()
                componente.append(actual)
                ax, ay = actual
                for nx in range(max(0, ax - 1), min(alpha.width, ax + 2)):
                    for ny in range(max(0, ay - 1), min(alpha.height, ay + 2)):
                        vecino = (nx, ny)
                        if vecino not in visitados and pixeles[nx, ny] > 0:
                            visitados.add(vecino)
                            pendientes.append(vecino)
            componentes.append(componente)
    for componente in componentes:
        if len(componente) < area_minima:
            for x, y in componente:
                pixeles[x, y] = 0
    imagen.putalpha(alpha)
    return imagen


def crear_imagen_social(logo):
    # El ancho del logo permanece en 900 px. El lienzo más alto agrega
    # aire vertical sin reducir la presencia de la marca al compartir.
    ancho, alto = 1200, 750
    fondo = Image.new('RGB', (ancho, alto))
    pixeles = fondo.load()
    base = (252, 250, 253)
    cian = (216, 246, 244)
    rosa = (252, 226, 240)
    for y in range(alto):
        for x in range(ancho):
            influencia_cian = max(0, 1 - ((x / 650) ** 2 + (y / 520) ** 2)) * 0.48
            influencia_rosa = max(0, 1 - (((ancho - x) / 720) ** 2 + (y / 560) ** 2)) * 0.52
            color = mezclar(base, cian, influencia_cian)
            pixeles[x, y] = mezclar(color, rosa, influencia_rosa)

    caja_visible = logo.getchannel('A').getbbox()
    if caja_visible is None:
        raise ValueError('El logo oficial no contiene pixeles visibles')

    logo_visible = logo.crop(caja_visible)
    objetivo_ancho = 900
    objetivo_alto = round(logo_visible.height * objetivo_ancho / logo_visible.width)
    logo_social = logo_visible.resize((objetivo_ancho, objetivo_alto), Image.Resampling.LANCZOS)
    posicion = ((ancho - objetivo_ancho) // 2, (alto - objetivo_alto) // 2)
    fondo.paste(logo_social, posicion, logo_social)
    fondo.save(IMAGEN_SOCIAL, 'PNG', optimize=True)


def crear_favicon(logo):
    # La palabra comienza unos píxeles antes de que termine el trazo inferior
    # del símbolo. El recorte horizontal evita mezclar la punta de la "A".
    region_marca = quitar_componentes_pequenos(logo.crop((700, 0, logo.width, 430)))
    caja = region_marca.getchannel('A').getbbox()
    if not caja:
        raise RuntimeError('No se encontró la marca de Aletea en el logo oficial.')
    marca = region_marca.crop(caja)
    lado = max(marca.size)
    margen = round(lado * 0.08)
    lienzo = Image.new('RGBA', (lado + margen * 2, lado + margen * 2), (0, 0, 0, 0))
    posicion = ((lienzo.width - marca.width) // 2, (lienzo.height - marca.height) // 2)
    lienzo.alpha_composite(marca, posicion)
    favicon = lienzo.resize((512, 512), Image.Resampling.LANCZOS)
    favicon.save(FAVICON, 'PNG', optimize=True)


def main():
    logo = Image.open(ORIGEN).convert('RGBA')
    crear_imagen_social(logo)
    crear_favicon(logo)
    print(f'Imagen social: {IMAGEN_SOCIAL}')
    print(f'Favicon: {FAVICON}')


if __name__ == '__main__':
    main()
