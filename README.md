# Qresp
Official [Qresp](http://qresp.org) software repository. 

## About
**Qresp** "Curation and Exploration of Reproducible Scientific Papers" is a Python application that facilitates the organization, annotation and exploration of data presented in scientific papers.

Reference: 

M. Govoni, M. Munakami, A. Tanikanti, J. H. Skone, H. B. Runesha, F. Giberti, J. de Pablo, and G. Galli, *Qresp, a tool for curating, discovering and exploring reproducible scientific papers*, Sci. Data 6, 190002 (2019). [https://doi.org/10.1038/sdata.2019.2](https://doi.org/10.1038/sdata.2019.2).

## Documentation
Project documentation is organized in [docs/README.md](docs/README.md).
Start with the [Quickstart](docs/guides/quickstart.md) or the
[RCC folder analysis guide](docs/curation/rcc-folder-analysis.md).

## Development 
The **Qresp** development is hosted on [GitHub](https://github.com/west-code-development/qresp), and licensed under the open-source GPLv3 license. See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md), and [AUTHORS.md](AUTHORS.md) for more information.

## Local development setup

| Component | Version | Where it is pinned |
| --- | --- | --- |
| Python (backend) | **3.11** or **3.14** | CI matrix; the Docker image uses 3.14 |
| Node.js (frontend) | **24** | `frontend/Dockerfile` |
| MongoDB | **4.4** | `docker-compose.yml` |

The backend is Flask 3 behind Connexion 3; the frontend is Next.js 16 with
React 19 and MUI 9. Step-by-step setup is in the
[Quickstart](docs/guides/quickstart.md); known problems are in
[Troubleshooting](docs/guides/troubleshooting.md).

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scriptsctivate
pip install -r requirements.lock.txt
python -m nose2 -v          # in-memory mongomock; no MongoDB needed
```

### Frontend
```bash
cd frontend
yarn install
yarn dev          # http://localhost:3000
yarn test
yarn build
```

### Docker (full stack)
```bash
sh nginx/generate-local-certs.sh     # self-signed dev certs, git-ignored
docker compose -f docker-compose.dev.yml up --build
```

### Continuous integration
GitHub Actions runs the backend suite on every push
([`.github/workflows/backend-smoke.yml`](.github/workflows/backend-smoke.yml)).
