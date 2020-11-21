import minimatch from 'minimatch';
import { Gitlab } from 'gitlab';

import { AbstractProvider } from './abstract-provider';

const map = {};

export class GitlabProvider extends AbstractProvider {
  constructor(private api: Gitlab) {
    super();
  }

  static getProviderByHostname({ host, token }) {
    if (!map[host]) {
      const api = new Gitlab({
        host: `https://${host}`,
        token
      });

      map[host] = new GitlabProvider(api);
    }

    return map[host];
  }

  async getAllProjects({ owner, name }) {
    const parts = owner.split('/');
    const projects = [
      ...(await this.getAllProjectsByGroup(parts[0])),
      ...(await this.getAllProjectsByUser(parts[0]))
    ];

    return projects
      .filter(project =>
        minimatch(project.path_with_namespace, `${owner}/${name}`)
      )
      .map(project => ({
        id: project.id,
        name: project.name,
        fullName: project.path_with_namespace,
        httpsUrl: project.http_url_to_repo,
        sshUrl: project.ssh_url_to_repo,
        fork: !!project.forked_from_project,
        tags: project.tag_list,
      }));
  }

  async getAllProjectsByGroup(search) {
    const top = (await this.api.Groups.search(search))[0];

    if (!top) {
      return [];
    }

    const nested = await this._getAllNestedGroups(top.id);
    const groups = [top, ...nested];

    return this._getAllGroupProjects(groups);
  }

  async getAllProjectsByUser(search) {
    const user = (await this.api.Users.search(search))[0];

    if (!user) {
      return [];
    }

    return this._getAllUserProjects(user);
  }

  async _getAllNestedGroups(parentId, result = []) {
    for (const child of await this.api.Groups.subgroups(parentId, {
      all_available: true,
    })) {
      result.push(child);
      await this._getAllNestedGroups(child.id, result);
    }

    return result;
  }

  async _getAllGroupProjects(groups, result = []) {
    for (const { id } of groups) {
      for (const child of await this.api.Groups.projects(id, {
        all_available: true,
      })) {
        result.push(child);
      }
    }

    return result;
  }

  async _getAllUserProjects(user, result = []) {
    for (const child of (await this.api.Users.projects(user.id)) as object[]) {
      result.push(child);
    }

    return result;
  }
}
