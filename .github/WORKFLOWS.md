# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for the FOODMISSION Data Framework project. The CI/CD pipeline is designed to ensure code quality, security, and reliable deployments.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)

**Triggers:** Push to main, tags (`v*.*.*`), Pull requests to main, Published releases

**Jobs:**

- **Lint and Type Check**: ESLint, TypeScript compilation, Prettier formatting
- **Security Scan**: npm audit, CodeQL analysis
- **Test**: Unit tests, integration tests, e2e tests with PostgreSQL and cache services
- **Build and Push**: Docker image building and pushing to GitHub Container Registry

**Key Features:**

- Parallel job execution for faster feedback
- Test coverage reporting with Codecov
- Multi-platform Docker builds (amd64, arm64)

### 2. Security Scanning (`security.yml`)

**Triggers:** Push, Pull requests, Daily schedule, Manual dispatch

**Jobs:**

- **Dependency Scan**: npm audit, Snyk vulnerability scanning
- **Container Scan**: Trivy vulnerability scanner, Hadolint Dockerfile linting
- **Secret Detection**: TruffleHog secret scanning
- **License Compliance**: License checker for dependencies
- **SAST**: CodeQL and Semgrep static analysis

## Configuration Files

### Dependabot (`dependabot.yml`)

Automated dependency updates for:

- npm packages (weekly, Mondays)
- Docker base images (weekly, Tuesdays)
- GitHub Actions (weekly, Wednesdays)

### Issue Templates

- **Bug Report**: Structured bug reporting with environment details
- **Feature Request**: Feature proposal with acceptance criteria

### Pull Request Template

Comprehensive PR template with:

- Change type classification
- Testing checklist
- Security considerations
- Performance impact assessment
- Deployment notes

## Environment Setup

### Required Secrets

#### Repository Secrets

```bash
# Container Registry
GITHUB_TOKEN                 # Automatically provided by GitHub

# Security Scanning
SNYK_TOKEN                   # Snyk API token for vulnerability scanning
SONAR_TOKEN                  # SonarCloud token for code quality analysis

# Codecov (optional)
CODECOV_TOKEN               # Codecov token for coverage reporting
```

### Environment Variables

The workflows use the following environment variables:

- `NODE_VERSION`: Node.js version (default: 24)
- `REGISTRY`: Container registry (ghcr.io)
- `IMAGE_NAME`: Docker image name (repository name)

## Workflow Features

### Security

- **Multi-layer security scanning**: Dependencies, containers, secrets, code
- **Automated vulnerability detection**: Daily scans with SARIF uploads
- **License compliance**: Automated license checking
- **Secret detection**: Prevents accidental secret commits

### Quality Assurance

- **Comprehensive testing**: Unit, integration, e2e
- **Code quality metrics**: SonarCloud integration
- **Automated formatting**: Prettier and ESLint enforcement
- **Commit message standards**: Conventional commits validation

## Usage Examples

### Creating a Release

```bash
# Create and push a tag to trigger a versioned image build
git tag v1.0.0
git push origin v1.0.0

# Or use GitHub CLI
gh release create v1.0.0 --generate-notes
```

## Monitoring and Observability

### Workflow Monitoring

- **Status badges**: Add to README for build status visibility
- **Notifications**: Configure Slack/email notifications for failures
- **Metrics**: Track deployment frequency, lead time, failure rate

### Application Monitoring

- **Health checks**: Application health endpoints
- **Metrics**: Prometheus metrics collection
- **Logging**: Structured logging with trace IDs
- **Alerting**: Set up alerts for critical failures

## Best Practices

### Branch Protection

Configure branch protection rules:

- Require status checks to pass
- Require up-to-date branches
- Require review from code owners
- Restrict pushes to main/develop

### Security

- Use least privilege principle for secrets
- Regularly rotate secrets and tokens
- Enable security advisories
- Review dependency updates

### Performance

- Use caching for dependencies
- Parallelize independent jobs
- Use appropriate runner types
- Monitor workflow execution times

## Troubleshooting

### Common Issues

#### Test Failures

- Check service container health
- Verify environment variables
- Review database migration status
- Check for port conflicts

#### Deployment Failures

- Check Docker image build logs
- Review image pull permissions
- Validate configuration files

#### Security Scan Failures

- Review vulnerability reports
- Update dependencies
- Check for false positives
- Configure scan exclusions if needed

### Debugging

- Enable debug logging: Set `ACTIONS_STEP_DEBUG=true`
- Use workflow dispatch for manual testing
- Check artifact uploads for detailed reports
- Review job logs for specific error messages

## Contributing

When modifying workflows:

1. Test changes in a fork first
2. Use semantic versioning for action updates
3. Document any new secrets or variables
4. Update this README with changes
5. Consider backward compatibility

## Support

For issues with the CI/CD pipeline:

1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review workflow run logs
3. Create an issue with the `ci/cd` label
4. Contact the DevOps team for infrastructure issues
