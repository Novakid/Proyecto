import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateFacturaDto } from './create-factura.dto';

describe('CreateFacturaDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const valid = {
    vendedor: 'Administrador',
    almacen: 'Principal',
    cliente: {
      nombre: 'Cliente',
      rfc: 'XAXX010101000',
      direccion: 'Calle 1',
      colonia: 'Centro',
      poblacion: 'Ciudad',
      fechaEntrega: '2026-08-17',
      operador: 'Operador',
      credito: false,
    },
    conceptos: [{ producto_id: 1, cantidad: 1, descuento: 0 }],
  };

  const transform = (value: object) =>
    pipe.transform(value, {
      type: 'body',
      metatype: CreateFacturaDto,
    });

  it('rechaza un folio principal enviado por el cliente', async () => {
    await expect(
      transform({ ...valid, folio: 'MANUAL-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('convierte un folio especial vacío en null', async () => {
    await expect(
      transform({ ...valid, folioEspecial: '   ' }),
    ).resolves.toMatchObject({ folioEspecial: null });
  });

  it('rechaza un folio especial mayor a 100 caracteres', async () => {
    await expect(
      transform({ ...valid, folioEspecial: 'A'.repeat(101) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
