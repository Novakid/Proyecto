import { BadRequestException } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { Producto } from '../productos/entities/producto.entity';
import { SaveCotizacionDto } from './dto/cotizacion.dto';

describe('CotizacionesService', () => {
  const service = new CotizacionesService({} as never, {} as never);
  const product = Object.assign(new Producto(), {
    id: 7,
    codigo: 'QA-7',
    descripcion: 'Producto QA',
    precio: 100,
    existencia: 10,
    activo: true,
  });
  const base = {
    clienteId: 1,
    vendedorId: 2,
    credito: false,
    almacen: 'Principal',
  } as SaveCotizacionDto;

  it('calcula subtotal, descuento, IVA y total desde precios del backend', () => {
    const result = service['calculate'](
      { ...base, conceptos: [{ productoId: 7, cantidad: 2, descuento: 10 }] },
      new Map([[7, product]]),
      new Map([[7, 100]]),
    );
    expect(result).toMatchObject({
      subtotal: 200,
      descuento: 20,
      iva: 28.8,
      total: 208.8,
    });
  });

  it('rechaza productos duplicados', () => {
    expect(() =>
      service['calculate'](
        {
          ...base,
          conceptos: [
            { productoId: 7, cantidad: 1, descuento: 0 },
            { productoId: 7, cantidad: 1, descuento: 0 },
          ],
        },
        new Map([[7, product]]),
        new Map([[7, 100]]),
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza cantidades superiores a la existencia', () => {
    expect(() =>
      service['calculate'](
        { ...base, conceptos: [{ productoId: 7, cantidad: 11, descuento: 0 }] },
        new Map([[7, product]]),
        new Map([[7, 100]]),
      ),
    ).toThrow('Cantidad superior a la existencia');
  });
});
