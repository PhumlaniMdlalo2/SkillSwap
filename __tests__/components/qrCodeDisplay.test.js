import { render, waitFor } from '@testing-library/react-native';
import QRCodeDisplay from '../../src/components/sessions/QRCodeDisplay';
import * as api from '../../src/services/api';

const mockQr = jest.fn(() => null);

jest.mock('react-native-qrcode-svg', () => (props) => mockQr(props));
jest.mock('../../src/services/api', () => ({
  createCheckInCode: jest.fn(),
}));

describe('QRCodeDisplay', () => {
  beforeEach(() => {
    mockQr.mockClear();
    api.createCheckInCode.mockResolvedValue({
      code: 'server-code',
      owner_role: 'learner',
      expires_at: '2026-11-05T10:01:30Z',
    });
  });

  it('encodes the server-issued code in the check-in payload', async () => {
    const { getByText } = await render(
      <QRCodeDisplay session={{ session_id: 'sess-1' }} counterpartLabel="teacher" />,
    );

    await waitFor(() => expect(mockQr).toHaveBeenCalled());
    const { value } = mockQr.mock.calls[0][0];
    const payload = JSON.parse(value);
    expect(payload.sessionId).toBe('sess-1');
    expect(payload.ownerRole).toBe('learner');
    expect(payload.type).toBe('skillswap-session-checkin');
    expect(payload.code).toBe('server-code');
    expect(getByText('Show this code to your teacher to check in')).toBeTruthy();
  });
});
