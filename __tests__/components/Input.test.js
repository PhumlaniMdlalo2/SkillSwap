import { render, fireEvent } from '@testing-library/react-native';
import Input from '../../src/components/ui/Input';

describe('Input password toggle', () => {
  it('hides the value by default when secureTextEntry is set', async () => {
    const { getByLabelText } = await render(<Input label="Password" secureTextEntry />);
    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('reveals the value when the toggle is pressed, and hides it again', async () => {
    const { getByLabelText } = await render(<Input label="Password" secureTextEntry />);

    await fireEvent.press(getByLabelText('Show password'));
    expect(getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(getByLabelText('Hide password')).toBeTruthy();

    await fireEvent.press(getByLabelText('Hide password'));
    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('renders no toggle for regular fields', async () => {
    const { queryByLabelText } = await render(<Input label="Email" />);
    expect(queryByLabelText('Show password')).toBeNull();
    expect(queryByLabelText('Hide password')).toBeNull();
  });
});
