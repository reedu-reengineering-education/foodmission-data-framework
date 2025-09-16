# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for the FOODMISSION Data Framework project. The CI/CD pipeline is designed to ensure code quality, security, and reliable deployments.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)

**Triggers:** Push to main/develop, Pull requests to main/develop

**Jobs:**

- **Lint and Type Check**: ESLint, TypeScript compilation, Prettier formatting
- **Security Scan**: npm audit, CodeQL analysis
- **Test**: Unit tests, integration tests, e2e tests with PostgreSQL and Redis services
- **Build and Push**: Docker image building and pushing to GitHub Container Registry

**Key Features:**

- Parallel job execution for faster feedback
- Test coverage reporting with Codecov
- Multi-platform Docker builds (amd64, arm64)
- SBOM (Software Bill of Materials) generation

### 2. Deployment Pipeline (`deploy.yml`)

**Triggers:** Push to main/develop, Manual workflow dispatch

**Jobs:**

- **Deploy to Staging**: Automatic deployment from develop branch
- **Deploy to Production**: Automatic deployment from main branch (requires staging success)

**Key Features:**

- Environment-specific configurations
- Database migration execution
- Smoke tests after deployment
- Automatic rollback on failure
- Kubernetes deployment with health checks

### 3. Security Scanning (`security.yml`)

**Triggers:** Push, Pull requests, Daily schedule, Manual dispatch

**Jobs:**

- **Dependency Scan**: npm audit, Snyk vulnerability scanning
- **Container Scan**: Trivy vulnerability scanner, Hadolint Dockerfile linting
- **Secret Detection**: TruffleHog secret scanning
- **License Compliance**: License checker for dependencies
- **SAST**: CodeQL and Semgrep static analysis

### 4. Release Management (`release.yml`)

**Triggers:** Git tags (v\*), Manual workflow dispatch

**Jobs:**

- **Create Release**: Generate changelog, create GitHub release
- **Build Artifacts**: Source archives, Docker images with release tags
- **Deploy Release**: Production deployment for stable releases

### 5. Performance Testing (`performance.yml`)

**Triggers:** Push, Pull requests to main, Weekly schedule, Manual dispatch

**Jobs:**

- **Load Testing**: k6 performance tests with various load patterns
- **Memory Profiling**: Memory usage analysis and leak detection

### 6. Code Quality (`code-quality.yml`)

**Triggers:** Push, Pull requests

**Jobs:**

- **Code Quality Analysis**: ESLint, Prettier, TypeScript, circular dependencies
- **SonarCloud**: Code quality metrics and technical debt analysis
- **Commit Lint**: Conventional commit message validation
- **Documentation**: OpenAPI spec validation, README completeness

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

#### Environment Secrets (Staging)

```bash
KUBE_CONFIG_STAGING         # Base64 encoded kubeconfig for staging cluster
DATABASE_URL_STAGING        # PostgreSQL connection string for staging
```

#### Environment Secrets (Production)

```bash
KUBE_CONFIG_PRODUCTION      # Base64 encoded kubeconfig for production cluster
DATABASE_URL_PRODUCTION     # PostgreSQL connection string for production
```

### Environment Variables

The workflows use the following environment variables:

- `NODE_VERSION`: Node.js version (default: 22)
- `REGISTRY`: Container registry (ghcr.io)
- `IMAGE_NAME`: Docker image name (repository name)

## Workflow Features

### Security

- **Multi-layer security scanning**: Dependencies, containers, secrets, code
- **Automated vulnerability detection**: Daily scans with SARIF uploads
- **License compliance**: Automated license checking
- **Secret detection**: Prevents accidental secret commits

### Quality Assurance

- **Comprehensive testing**: Unit, integration, e2e, performance
- **Code quality metrics**: SonarCloud integration
- **Automated formatting**: Prettier and ESLint enforcement
- **Commit message standards**: Conventional commits validation

### Performance

- **Load testing**: k6-based performance testing
- **Memory profiling**: Memory leak detection
- **Performance regression detection**: Automated performance monitoring

### Deployment

- **Environment promotion**: Staging → Production workflow
- **Database migrations**: Automated schema updates
- **Health checks**: Post-deployment verification
- **Rollback capability**: Automatic failure recovery

## Usage Examples

### Manual Deployment

```bash
# Trigger manual deployment to staging
gh workflow run deploy.yml -f environment=staging

# Trigger manual deployment to production
gh workflow run deploy.yml -f environment=production
```

### Creating a Release

```bash
# Create and push a tag to trigger release workflow
git tag v1.0.0
git push origin v1.0.0

# Or use GitHub CLI
gh release create v1.0.0 --generate-notes
```

### Running Performance Tests

```bash
# Trigger performance tests manually
gh workflow run performance.yml
```

## Monitoring and Observability

### Workflow Monitoring

- **Status badges**: Add to README for build status visibility
- **Notifications**: Configure Slack/email notifications for failures
- **Metrics**: Track deployment frequency, lead time, failure rate

### Application Monitoring

- **Health checks**: Kubernetes liveness/readiness probes
- **Metrics**: Prometheus metrics collection
- **Logging**: Structured logging with correlation IDs
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

- Verify Kubernetes cluster connectivity
- Check resource quotas and limits
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
