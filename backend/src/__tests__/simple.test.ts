describe('Simple Test', () => {
  it('deve somar dois números', () => {
    expect(1 + 1).toBe(2);
  });

  it('deve verificar se Jest está funcionando', () => {
    expect(true).toBeTruthy();
  });

  it('deve verificar tipos do TypeScript', () => {
    const message: string = 'Jest e TypeScript funcionando';
    expect(typeof message).toBe('string');
  });
});
