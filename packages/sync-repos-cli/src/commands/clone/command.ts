import fs from 'fs';
import path from 'path';
import gitUrlParse from 'git-url-parse';

import { Command } from 'clipanion';
import * as yup from 'yup';

import { MANIFEST_NAME, getProvider } from '../../helpers';

export class CloneCommand extends Command {
  @Command.String('--output')
  public output = 'repos';

  @Command.String('--schema')
  public schema = 'ssh';

  @Command.String('--depth')
  public depth = 1;

  @Command.Boolean('--manifest')
  public manifest: boolean;

  @Command.Rest()
  public queries: string[] = [];

  @Command.Path(`clone`)
  async execute() {
    const rootDir = this.output ? path.resolve(this.output) : process.cwd();
    const projects = [];

    for (const query of this.queries) {
      const provider = await getProvider(query);
      const { owner, name } = gitUrlParse(query);
      projects.push(...(await provider.getAllProjects({ owner, name })));
    }

    fs.writeFileSync(
      MANIFEST_NAME,
      JSON.stringify(
        {
          queries: this.queries,
          schema: this.schema,
          depth: this.depth,
          output: this.output,
          projects
        },
        null,
        2
      )
    );

    if (this.manifest) {
      return;
    }

    for (const project of projects) {
      const url = project.httpsUrl;
      const provider = await getProvider(url);
      const { resource } = gitUrlParse(url);

      await provider.cloneProject({
        project,
        output: `${rootDir}/${resource}`,
        schema: this.schema,
        depth: this.depth,
      });
    }
  }

  static schema = yup.object().shape({
    depth: yup.number().integer()
  });
}
