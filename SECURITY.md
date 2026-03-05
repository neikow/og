# Security Policy

## Supported Versions

Security fixes are applied to the latest release only. We recommend always running the most recent version.

| Version        | Supported |
|----------------|-----------|
| Latest release | Yes       |
| Older releases | No        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

To report a vulnerability, email **security@neikow.dev** with the subject line `[og] Security Vulnerability`.

Include as much of the following information as possible to help us understand and reproduce the issue:

- Type of vulnerability (e.g. injection, authentication bypass, information disclosure)
- Affected component (API, frontend, Docker image, etc.)
- Step-by-step reproduction instructions
- Proof-of-concept or exploit code (if available)
- Potential impact and severity assessment

You will receive an acknowledgement within **48 hours**. We aim to provide a fix or mitigation within **14 days** for critical issues and **90 days** for others, depending on complexity.

We ask that you:

- Give us a reasonable amount of time to address the issue before public disclosure
- Avoid accessing or modifying data belonging to other users
- Act in good faith and not cause harm to users or the service

We are grateful for responsible disclosures and will credit researchers in the release notes unless they request anonymity.

## Scope

The following are in scope:

- The `og` server (API and rendered output)
- Authentication and session handling
- API key generation and validation
- Template rendering and code execution sandbox
- The Docker image and its default configuration

The following are out of scope:

- Vulnerabilities in third-party dependencies (please report those upstream)
- Denial-of-service attacks that require a valid authenticated session
- Issues in self-hosted deployments caused by misconfiguration (e.g. exposing the port without a reverse proxy)
