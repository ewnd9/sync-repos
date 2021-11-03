# `sync-repos`

## Install

```sh
$ yarn add sync-repos
```

## Usage

```ts
import { GitlabProvider } from 'sync-repos';

const provider = GitlabProvider.getProviderByHostname({ host: 'github.com', process.env.GH_TOKEN });
const projects = await provider.getAllProjects({ owner: 'ewnd9', name: '*' });
```

## License

MIT © [ewnd9](http://ewnd9.com)
