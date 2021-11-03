import fs from 'fs';
import path from 'path';
import makeDir from 'make-dir';
import execa from 'execa';

export class AbstractProvider {
  async cloneProject({ project, output, schema, depth, pull }) {
    const name = project.fullName;
    const repoFsPath = `${output}/${name}`;

    if (fs.existsSync(repoFsPath)) {
      if (pull) {
        try {
          const { stdout: branch } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoFsPath });

          await execa('git', ['pull', 'origin', branch], {
            stdio: 'inherit',
            cwd: repoFsPath,
          });
        } catch (err) {
          console.error(err);
        }
      }

      return;
    }

    await makeDir(path.dirname(repoFsPath));
    const cloneUrl = schema === 'ssh' ? project.sshUrl : project.httpsUrl;

    const args = ['clone', cloneUrl, repoFsPath];

    if (depth) {
      args.push('--depth', depth);
    }

    await execa('git', args, {
      stdio: 'inherit',
    });
  }
}
