import { Alert, Platform } from 'react-native';
import { confirmAction, notify } from '../src/utils/alert';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('confirmAction', () => {
  const originalConfirm = global.window;

  beforeEach(() => {
    global.window = { confirm: jest.fn(() => true) };
  });

  afterEach(() => {
    global.window = originalConfirm;
  });

  it('calls onConfirm when the user confirms on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onConfirm = jest.fn();
    confirmAction('Title', 'Message', { onConfirm });
    expect(global.window.confirm).toHaveBeenCalledWith('Title\n\nMessage');
    expect(onConfirm).toHaveBeenCalled();
  });

  it('does not call onConfirm when the user cancels on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onConfirm = jest.fn();
    global.window.confirm = jest.fn(() => false);
    confirmAction('Title', 'Message', { onConfirm });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('filters empty title/message on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onConfirm = jest.fn();
    confirmAction('', 'Message', { onConfirm });
    expect(global.window.confirm).toHaveBeenCalledWith('Message');
    expect(onConfirm).toHaveBeenCalled();
  });

  it('shows an Alert on native', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();

    confirmAction('Title', 'Message', {
      confirmText: 'Yes',
      destructive: true,
      onConfirm,
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Title',
      'Message',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Yes', style: 'destructive' }),
      ])
    );
  });
});

describe('notify', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    global.window = { alert: jest.fn() };
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('calls window.alert on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    notify('Title', 'Message');
    expect(global.window.alert).toHaveBeenCalledWith('Title\n\nMessage');
  });

  it('calls onDismiss after alerting on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onDismiss = jest.fn();
    notify('Title', 'Message', onDismiss);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows an Alert on native with a dismiss button', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDismiss = jest.fn();

    notify('Title', 'Message', onDismiss);

    expect(alertSpy).toHaveBeenCalledWith(
      'Title',
      'Message',
      expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
    );
    expect(onDismiss).not.toHaveBeenCalled();
  });
});