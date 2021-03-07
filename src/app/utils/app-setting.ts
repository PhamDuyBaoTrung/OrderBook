import {environment} from '../../environments/environment';

export class AppSetting {
  /**
   * Get the configuration of WS endpoint
   */
  static wsEndpoint() {
    return environment.wsEndpoint;
  }
}
