import { render } from '@testing-library/react-native';
import QRCodeDisplay from '../../src/components/sessions/QRCodeDisplay';

const mockQr = jest.fn(() => null);

jest.mock('react-native-qrcode-svg', () => (props) => mockQr(props));

describe('QRCodeDisplay', () => {
  beforeEach(() => {
    mockQr.mockClear();
  });

  it('encodes the session id, owner role, and a time-limited expiry in the check-in payload', async () => {
    const { getByText } = await render(
      <QRCodeDisplay session={{ session_id: 'sess-1' }} role="learner" counterpartLabel="teacher" />,
    );

    const { value } = mockQr.mock.calls[0][0];
    const payload = JSON.parse(value);
    expect(payload.sessionId).toBe('sess-1');
    expect(payload.ownerRole).toBe('learner');
    expect(payload.type).toBe('skillswap-session-checkin');
    expect(payload.codeExp).toEqual(expect.any(Number));
    expect(payload.codeExp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(getByText('Show this code to your teacher to check in')).toBeTruthy();
  });
});
