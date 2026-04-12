
describe('TypeStep disaster types', () => {
  const TYPES = ['fire','flood','storm','earthquake','hurricane','tsunami','tornado','other'];
  const LEVELS = ['low','medium','high','critical'];
  it('has 8 types', () => expect(TYPES).toHaveLength(8));
  it('includes fire', () => expect(TYPES).toContain('fire'));
  it('includes flood', () => expect(TYPES).toContain('flood'));
  it('has 4 severity levels', () => expect(LEVELS).toHaveLength(4));
  it('includes critical', () => expect(LEVELS).toContain('critical'));
  it('default type is other', () => expect(TYPES[TYPES.length-1]).toBe('other'));
  it('default severity is medium', () => expect(LEVELS[1]).toBe('medium'));
  it('fire is first type', () => expect(TYPES[0]).toBe('fire'));
});
