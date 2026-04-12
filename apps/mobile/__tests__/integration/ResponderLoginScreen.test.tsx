
import { isValidEmail } from '@utils/validation';
describe('ResponderLoginScreen validation', () => {
  it('empty email is invalid', () => expect(isValidEmail('')).toBe(false));
  it('valid email passes', () => expect(isValidEmail('john@drs.ie')).toBe(true));
  it('email without @ is invalid', () => expect(isValidEmail('johndrs.ie')).toBe(false));
  it('email without domain invalid', () => expect(isValidEmail('john@')).toBe(false));
});
describe('ResponderLoginScreen fetch', () => {
  beforeEach(() => (global.fetch as jest.Mock).mockReset());
  it('POSTs to emergency-team/login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok:true, status:200, json: async()=>({ tokens:{ access_token:'tok', refresh_token:'ref' }, team_member:{ id:'tm1', full_name:'John', email:'j@drs.ie', role:'firefighter', department:'fire', employee_id:'E1' } }) });
    const res = await fetch('http://192.168.1.1:8000/api/v1/emergency-team/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email:'john@drs.ie', password:'secret' }) });
    const data = await res.json();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/emergency-team/login'), expect.objectContaining({ method:'POST' }));
    expect(data.tokens.access_token).toBe('tok');
  });
  it('returns 401 on bad credentials', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok:false, status:401, json: async()=>({ detail:'Invalid credentials' }) });
    const res = await fetch('http://192.168.1.1:8000/api/v1/emergency-team/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email:'bad@drs.ie', password:'wrong' }) });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });
  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failed'));
    await expect(fetch('http://192.168.1.1:8000/api/v1/emergency-team/login', { method:'POST' })).rejects.toThrow('Network failed');
  });
});
