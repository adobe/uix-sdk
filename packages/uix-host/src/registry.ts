export interface ExtensionDefinition {
  name: string;
  title: string;
  description: string;
  icon: string;
  publisher: string;
  endpoints: Record<string, EndpointDefinition>;
  xrInfo: ExtensionInfo;
  status: string;
}

export type EndpointDefinition = Record<string, Array<OperationDefinition>>

export interface ExtensionInfo {
  supportEmail: string;
  appId: string;
}

export interface OperationDefinition {
  href: string;
  metadata: OperationMetadata;
}

export interface OperationMetadata {
  services: Array<object>;
  profile: OperationProfile;
}

export interface OperationProfile {
  client_id: string;
  scope: string;
}

export class ExtensionRegistry {
  private readonly exchangeUrl: string;
  private readonly token: string;
  private readonly apiKey: string;

  constructor(apiKey: string, token: string, exchangeUrl?: string) {
    this.apiKey = apiKey;
    this.token = token;
    this.exchangeUrl = exchangeUrl || 'https://appregistry.adobe.io';
  }

  /**
   * Fetch extensions for an extension point.
   *
   * @param org organisation ID (eg. 0123@AdobeOrg)
   * @param xtp extension point ID (eg. xxx/yyy/1)
   */
  async getExtensions(org: string, xtp: string): Promise<Array<ExtensionDefinition>> {
    const resp = await fetch(`${this.exchangeUrl}/myxchng/v1/org/${encodeURIComponent(org)}/xtn/${xtp}?auth=true`, {
      headers: {
        "accept": "application/json",
        "authorization": this.token,
        "x-api-key": this.apiKey,
      },
    });

    if (resp.status != 200) {
      throw new Error(`extension registry returned non-200 response (${resp.status}): ${await resp.text()}`)
    }

    return await resp.json();
  }
}
