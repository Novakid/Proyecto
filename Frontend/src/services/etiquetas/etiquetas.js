export const generarDPL = (items) => {
  let dpl = '';

  items.forEach(item => {
    for (let i = 0; i < item.cantidad; i++) {
      dpl += `
<STX>L
D11
H10
Q200,24
q400
S2
D0
A50,50,0,3,1,1,N,"${item.nombre}"
A50,100,0,3,1,1,N,"$${item.precio}"
P1
`;
    }
  });

  return dpl;
};