import {Platform} from 'react-native';
import {
  RESULTS,
  PERMISSIONS,
  checkMultiple,
  requestMultiple,
} from 'react-native-permissions';

class Permission {
  private get AUDIO_PERMISSION() {
    return Platform.OS === 'android'
      ? [PERMISSIONS.ANDROID.RECORD_AUDIO]
      : [PERMISSIONS.IOS.MICROPHONE];
  }

  /**
   * Request audio permission based on platform
   * @returns {Promise<boolean>} Whether the permission was granted
   */
  async requestAudioPermission(): Promise<boolean> {
    // Check if permission is already granted
    if (await this.checkAudioPermission()) {
      console.log('AUDIO PERMISSION ALREADY GRANTED ✅');
      return true;
    }

    try {
      const results = await requestMultiple(this.AUDIO_PERMISSION);
      const allGranted = Object.values(results).every(
        status => status === RESULTS.GRANTED,
      );
      console.log(
        allGranted
          ? 'AUDIO PERMISSION GRANTED ✅'
          : 'AUDIO PERMISSION DENIED ❌',
      );
      return allGranted;
    } catch (error) {
      console.error('Error requesting audio permission:', error);
      return false;
    }
  }

  /**
   * Check if audio permission is granted
   * @returns {Promise<boolean>} Whether the permission is granted
   */
  async checkAudioPermission(): Promise<boolean> {
    try {
      const statuses = await checkMultiple(this.AUDIO_PERMISSION);
      const allGranted = Object.values(statuses).every(
        status => status === RESULTS.GRANTED,
      );
      console.log('Permission Check:', allGranted ? 'GRANTED ✅' : 'DENIED ❌');
      return allGranted;
    } catch (error) {
      console.error('Error checking audio permission:', error);
      return false;
    }
  }
}

export default new Permission();