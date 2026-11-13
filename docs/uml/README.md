# UML artifacts and reproducible rendering

| Mandatory UML | Source | SVG (zoomable) | PNG |
| --- | --- | --- | --- |
| Class | [source](class-diagram.puml) | [vector](class-diagram.svg) | [image](class-diagram.png) |
| Deployment | [source](deployment-diagram.puml) | [vector](deployment-diagram.svg) | [image](deployment-diagram.png) |

The diagrams were authored against the actual Java classes, XML descriptors and client code, not generated from an imagined architecture. Open the full-size SVG in a browser for readable class members; reduced Markdown previews are not intended to show all details.

## Source mapping

All 14 project backend types are in `edu.miniproject`:

- REST boundary: RestApplication, HealthResource, TranslatorResource, ApiExceptionMapper.
- Translation: TranslationService, GeminiTranslationService, GeminiConfiguration.
- Data/errors: TranslationRequest, TranslationResponse, ErrorResponse (records), ApiException.
- Security: SecurityConfiguration, TranslatorIdentityStore, SecurityErrorServlet.

There are **14 project types**, including the service interface. Framework nodes are marked external. Responsibility packages in the diagram are visual groupings, not additional Java packages.

Public constructors/methods and selected fields are shown with their source visibility. Generated record constructors/accessors and package-private injection test constructors are omitted for readability. `validateRequest`/`service` parameter names abbreviate their servlet/context types to avoid excessively wide nodes. Solid directed associations represent stored references; dashed dependencies show use/construction; hollow triangles distinguish inheritance from interface realization. No lifecycle composition is asserted. Jakarta JSON-P serialization and Java HttpClient are the actual implementation choices.

`web.xml` protects `/*` except exact `/api/health`; `server.xml` maps `translators` to `translator`. SecurityConfiguration implements Jakarta Security's HttpAuthenticationMechanism through Liberty's Jakarta Authentication bridge. SecurityErrorServlet is a narrow protected error-dispatch compatibility handler, not a login endpoint.

The deployment diagram represents the tested Windows/Chrome/Python/PHP/physical Android Expo Go setup. ADB routes 9080 (API) and 8082 (Metro) are distinct. Only Java connects to Gemini. The native debug project was generated, but no native APK was run; Expo Go's own policy applies on the verified phone.

## Tooling

Rendered locally with official **PlantUML 1.2026.10** (Java 21). Downloaded from its [official GitHub release](https://github.com/plantuml/plantuml/releases/tag/v1.2026.10). SHA-256 of `plantuml-1.2026.10.jar`:

```text
e9bc9e6b2eb715e8c0c929f3dcb5fc1923be13f37599b09c293c66d354e88686
```

The official release asset digest was checked before use. Download the JAR independently; no tool binary is bundled. The class layout uses PlantUML's default DOT renderer (the Windows JAR reported Graphviz 2.44.1); deployment uses the bundled Smetana engine. No separate global Graphviz installation was made. Other platforms may require [Graphviz](https://plantuml.com/graphviz-dot) for the class layout.

From repository root, after downloading the verified JAR to a location of your choice:

```powershell
java -jar path/to/plantuml-1.2026.10.jar -version
pwsh -File docs/uml/render.ps1 -PlantUmlJar path/to/plantuml-1.2026.10.jar
```

Equivalent direct commands:

```powershell
java -jar path/to/plantuml-1.2026.10.jar -checkonly docs/uml/class-diagram.puml docs/uml/deployment-diagram.puml
java -jar path/to/plantuml-1.2026.10.jar -tsvg docs/uml/class-diagram.puml docs/uml/deployment-diagram.puml
java -jar path/to/plantuml-1.2026.10.jar -tpng docs/uml/class-diagram.puml docs/uml/deployment-diagram.puml
```

The script fails on syntax/render errors, invalid SVG XML or invalid PNG signatures. The published PNGs were visually checked for clipped text and readable relationships. Reinspect the exports whenever changing source or renderer versions.
