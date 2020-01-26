import fs from 'fs';
import path from 'path';
import gitUrlParse from 'git-url-parse';

import { Command } from 'clipanion';
import * as yup from 'yup';

import { MANIFEST_NAME, getProvider } from '../../helpers';

export class CloneCommand extends Command {
  @Command.Boolean('--manifest')
  public manifest: boolean;

  @Command.Path(`sync`)
  @Command.Path()
  async execute() {
    if (!fs.existsSync(MANIFEST_NAME)) {
      console.error(`${MANIFEST_NAME} doesn't exist, run clone first`);
      return;
    }

    const manifest: {
      output: string;
      queries: string[];
      depth: number;
      schema: string;
    } = JSON.parse(fs.readFileSync(MANIFEST_NAME, 'utf-8'));

    const rootDir = path.resolve(manifest.output);
    const projects = [];

    for (const query of manifest.queries) {
      const provider = await getProvider(query);
      const { owner, name } = gitUrlParse(query);
      projects.push(...(await provider.getAllProjects({ owner, name })));
    }

    fs.writeFileSync(
      MANIFEST_NAME,
      JSON.stringify(
        {
          ...manifest,
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
        schema: manifest.schema,
        depth: manifest.depth
      });
    }
  }

  static schema = yup.object().shape({
    depth: yup.number().integer()
  });
}
