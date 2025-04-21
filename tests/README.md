# Swetrix JS Tests

This directory contains tests for the Swetrix JavaScript analytics client.

## Test Structure

- **initialisation.test.ts**: Tests for library initialisation and core functionality
- **pageview.test.ts**: Tests for page view tracking functionality
- **events.test.ts**: Tests for custom event tracking
- **errors.test.ts**: Tests for error tracking
- **utils.test.ts**: Tests for utility functions (utils.ts file)

## Running Tests

To run the tests, use:

```bash
npm test
```

For watching mode:

```bash
npm run test:watch
```

## Test Environment

Tests use Jest with jsdom environment to simulate a browser environment. The library is tested in isolation with mocked API requests.

## Mocking Strategy

- API requests are mocked to avoid actual network requests
- Browser APIs (window, document, navigator) are mocked as needed
- The library's internal methods are selectively mocked or spied on to verify behaviour

## Writing New Tests

When adding new tests:

1. Follow the existing patterns of mocking and setup
2. Use descriptive test names that explain what aspect is being tested
3. Structure tests with Arrange-Act-Assert pattern
4. Clean up mocks between tests using beforeEach/afterEach

## Coverage

Test coverage can be checked by running:

```bash
npm test -- --coverage
```
