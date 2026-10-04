import fs from 'fs'
import path from 'path'
import ts from 'typescript'

function files(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : entry.name.endsWith('.controller.ts')
          ? [path.join(directory, entry.name)]
          : [],
    )
}
const decorators = (node: ts.Node) =>
  ts.canHaveDecorators(node)
    ? ts
        .getDecorators(node)
        ?.map((decorator) => decorator.expression)
        .filter(ts.isCallExpression) || []
    : []
const named = (calls: ts.CallExpression[], name: string) =>
  calls.find((call) => call.expression.getText() === name)

describe.each(['cloud', 'community'])(
  '%s API permission coverage',
  (edition) => {
    const root = path.resolve(__dirname, '../../..', edition, 'src')
    it('has explicit supported policies for every API-enabled controller method', () => {
      let count = 0
      for (const file of files(root)) {
        const source = ts.createSourceFile(
          file,
          fs.readFileSync(file, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        )
        for (const controller of source.statements.filter(
          ts.isClassDeclaration,
        )) {
          const classPath =
            named(
              decorators(controller),
              'Controller',
            )?.arguments[0]?.getText() || ''
          for (const method of controller.members.filter(
            ts.isMethodDeclaration,
          )) {
            const calls = decorators(method)
            const auth = named(calls, 'Auth')
            if (
              auth?.arguments[0]?.kind !== ts.SyntaxKind.TrueKeyword &&
              !named(calls, 'ApiKeyCollection')
            )
              continue
            count++
            const policy = named(calls, 'ApiKeyAccess')
            if (!policy)
              throw new Error(
                `${file}:${method.name.getText()} has no API permission policy`,
              )
            const [scope, location, field] = policy.arguments
              .slice(0, 3)
              .map((argument) => (argument as ts.StringLiteral).text)
            expect(scope).toMatch(
              /^(analytics|events|projects|funnels|annotations|errors|replays|goals|flags|revenue|organisations):(read|write)$/,
            )
            if (location === 'params') {
              const route = calls.find((call) =>
                ['Get', 'Post', 'Put', 'Patch', 'Delete'].includes(
                  call.expression.getText(),
                ),
              )
              const routePath = route?.arguments[0]?.getText() || ''
              if (!`${classPath}/${routePath}`.includes(`:${field}`))
                throw new Error(
                  `${file}:${method.name.getText()} references a nonexistent path parameter ${field}`,
                )
            }
            if (['goal', 'flag', 'export'].includes(location)) {
              const params = method.parameters
                .flatMap((parameter) => decorators(parameter))
                .filter((call) => call.expression.getText() === 'Param')
                .map((call) => (call.arguments[0] as ts.StringLiteral)?.text)
              expect(params).toContain(field)
            }
          }
        }
      }
      expect(count).toBeGreaterThan(90)
    })
  },
)
