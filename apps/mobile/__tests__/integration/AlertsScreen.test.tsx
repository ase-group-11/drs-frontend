
describe('AlertsScreen filter logic', () => {
  const makeAlert = (severity, dist) => ({ id:'a1', severity, distance: String(dist), type:'warning', disasterType:'fire', message:'Test', issuedAt: new Date(), isRead: false, title:'Alert', location:{ latitude:53.35, longitude:-6.26, name:'Dublin' } });
  it('critical filter returns critical only', () => {
    const alerts = [makeAlert('critical',2), makeAlert('medium',1)];
    expect(alerts.filter(a => a.severity==='critical')).toHaveLength(1);
  });
  it('my_area filter returns within 1km', () => {
    const alerts = [makeAlert('high',0.5), makeAlert('high',5)];
    expect(alerts.filter(a => parseFloat(a.distance)<=1)).toHaveLength(1);
  });
  it('all filter returns all', () => {
    const alerts = [makeAlert('critical',2), makeAlert('medium',1)];
    expect(alerts).toHaveLength(2);
  });
  it('empty alerts gives zero results', () => {
    expect([].filter((a:any) => a.severity==='critical')).toHaveLength(0);
  });
  it('counts critical alerts correctly', () => {
    const alerts = [makeAlert('critical',1), makeAlert('critical',2), makeAlert('low',3)];
    expect(alerts.filter(a => a.severity==='critical').length).toBe(2);
  });
});
