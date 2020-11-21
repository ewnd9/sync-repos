import minimatch from 'minimatch';
import Octokit from '@octokit/rest';

import { AbstractProvider } from './abstract-provider';

const map = {};

export class GithubProvider extends AbstractProvider {
  constructor(private api: Octokit) {
    super();
  }

  static getProviderByHostname({ host, token }) {
    if (!map[host]) {
      const api = new Octokit({
        baseUrl: `https://api.${host}`,
        auth: token
      });

      map[host] = new GithubProvider(api);
    }

    return map[host];
  }

  async getAllProjects({ owner, name }) {
    const parts = owner.split('/');
    const user = await this.api.users.getByUsername({ username: parts[0] });
    const projects = [];

    if (user.data.type === 'User') {
      projects.push(...(await this._getAllUserProjects(parts[0])));
    } else {
      projects.push(...(await this._getAllOrgProjects(parts[0])));
    }

    return projects
      .filter(project => minimatch(project.full_name, `${owner}/${name}`))
      .map(project => ({
        id: project.id,
        name: project.name,
        fullName: project.full_name,
        httpsUrl: project.clone_url,
        sshUrl: project.ssh_url,
        fork: project.fork,
        tags: project.topics
      }));
  }

  async _getAllOrgProjects(org) {
    const result = [];

    for (let page = 0; ; page++) {
      const { data } = await this.api.repos.listForOrg({
        org,
        page: page + 1,
        per_page: 100,
        // https://github.com/octokit/rest.js/issues/1165#issuecomment-448666000
        headers: {
          accept: 'application/vnd.github.mercy-preview+json'
        },
      });

      if (data.length === 0) {
        break;
      }

      result.push(...data);
    }

    return result;
  }

  async _getAllUserProjects(username) {
    const result = [];

    for (let page = 0; ; page++) {
      const { data } = await this.api.repos.listForUser({
        username,
        page: page + 1,
        per_page: 100,
        // https://github.com/octokit/rest.js/issues/1165#issuecomment-448666000
        headers: {
          accept: 'application/vnd.github.mercy-preview+json'
        },
      });

      if (data.length === 0) {
        break;
      }

      result.push(...data);
    }

    return result;
  }
}
