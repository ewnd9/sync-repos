import gitUrlParse from 'git-url-parse';

import {GitlabProvider} from 'sync-repos/dist/providers/gitlab-provider';
import {GithubProvider} from 'sync-repos/dist/providers/github-provider';

export const MANIFEST_NAME = '.sync-repos.json';

export async function getProvider(query) {
  const { resource } = gitUrlParse(query);
  const key = `token-${resource}`;
  const config = await this.ensureConfig('repo-clone', {
    [key]: {
      type: 'password'
    }
  });

  const token = config[key];

  if (resource.includes('gitlab')) {
    return GitlabProvider.getProviderByHostname({ host: resource, token });
  } else if (resource.includes('github')) {
    return GithubProvider.getProviderByHostname({ host: resource, token });
  } else {
    throw new Error(`Unknown resource: "${resource}"`);
  }
}

export async function ensureConfig(
  cmdKey: string,
  params: { [key: string]: { type: string; description?: string } }
) {
  const { default: prompts } = await import('prompts');
  const { default: Configstore } = await import('configstore');
  const confData = new Configstore('sync-repos-cli');

  const result = {};

  for (const [paramRawKey, v] of Object.entries(params)) {
    const paramKey = paramRawKey.replace(/\./g, '-');
    const key = `${cmdKey}.${paramKey}`;
    const ret = confData.get(key);

    if (ret !== undefined) {
      result[paramRawKey] = ret;
      continue;
    }

    const response = await prompts({
      type: v.type || 'text',
      name: 'value',
      message: v.description || paramRawKey
    });

    result[paramRawKey] = response.value;
    confData.set(key, response.value);
  }

  return result;
}
