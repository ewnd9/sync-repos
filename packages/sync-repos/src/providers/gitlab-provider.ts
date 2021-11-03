import minimatch from 'minimatch';
import axios, { AxiosInstance } from 'axios';

import { AbstractProvider } from './abstract-provider';

const map = {};

export class GitlabProvider extends AbstractProvider {
  perPage = 100;

  constructor(private api: AxiosInstance) {
    super();
  }

  static getProviderByHostname({ host, token }) {
    if (!map[host]) {
      const api = axios.create({
        baseURL: `https://${host}`,
        headers: { 'PRIVATE-TOKEN': token },
      });

      map[host] = new GitlabProvider(api);
    }

    return map[host];
  }

  async getAllProjects({ owner, name }: { owner: string; name: string }) {
    const parts = owner.split('/');

    const staticPart = parts.filter((part) => part.indexOf('*') === -1).join('/');

    const promises = [this.getAllProjectsByGroup(staticPart)];

    if (parts.length === 2) {
      promises.push(this.getAllProjectsByUser(staticPart));
    }

    const projects = (await Promise.all(promises)).flatMap((_) => _);

    return projects
      .filter((project) => minimatch(project.path_with_namespace, `${owner}/${name}`))
      .map((project) => ({
        id: project.id,
        name: project.name,
        fullName: project.path_with_namespace,
        httpsUrl: project.http_url_to_repo,
        sshUrl: project.ssh_url_to_repo,
        fork: !!project.forked_from_project,
        archived: !!project.archived,
        tags: project.tag_list,
      }));
  }

  async getAllProjectsByGroup(search: string) {
    return fetchAll(
      async ({ page }) => {
        const response = await this.api.get(`/api/v4/groups/${encodeURIComponent(search)}/projects`, {
          params: {
            include_subgroups: true,
            all_available: true,
            page,
            per_page: this.perPage,
          },
        });

        return response.data;
      },
      {
        perPage: this.perPage,
      }
    );
  }

  async getAllProjectsByUser(search: string) {
    return fetchAll(
      async ({ page }) => {
        const response = await this.api.get(`/api/v4/users/${encodeURIComponent(search)}/projects`, {
          params: {
            page,
            per_page: this.perPage,
          },
        });

        return response.data;
      },
      {
        perPage: this.perPage,
      }
    );
  }
}

async function fetchAll<T>(fetcher: (opts: { page: number }) => Promise<T[]>, { perPage }: { perPage: number }) {
  const result = [];

  for (let page = 1; ; page++) {
    let data;

    try {
      data = await fetcher({ page });
    } catch (err) {
      if (err.response?.status !== 404) {
        throw err;
      }

      break;
    }

    result.push.apply(result, data);

    if (data.length !== perPage) {
      break;
    }
  }

  return result;
}
