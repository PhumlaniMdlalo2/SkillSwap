import { render, fireEvent, act } from '@testing-library/react-native';
import CreateBountyModal from '../../src/components/bounties/CreateBountyModal';

describe('CreateBountyModal', () => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();
  const base = { visible: true, onClose, onSubmit, submitting: false };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables Post Bounty and explains what is missing when the fields are too short', async () => {
    const { getByLabelText, getByText } = await render(<CreateBountyModal {...base} />);

    expect(getByLabelText('Post Bounty').props.accessibilityState.disabled).toBe(true);
    expect(getByText(/Title needs at least 5 characters/)).toBeTruthy();
  });

  it('enables Post Bounty and submits once the fields meet the minimums', async () => {
    const { getByLabelText, getByPlaceholderText } = await render(<CreateBountyModal {...base} />);

    const titleInput = getByPlaceholderText(/e.g. Debug a React hook/);
    const descInput = getByPlaceholderText(/Explain what you are trying/);

    await act(async () => {
      titleInput.props.onChangeText('Help me fix my app');
      descInput.props.onChangeText('I need help debugging this React Native project, please.');
    });

    const postButton = getByLabelText('Post Bounty');
    expect(postButton.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(postButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Help me fix my app',
      category: 'Music',
      rewardType: 'token',
      urgency: 'this_week',
    });
  });
});