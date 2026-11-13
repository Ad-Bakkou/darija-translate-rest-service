package edu.miniproject;
import jakarta.enterprise.inject.Alternative;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.*;
/** Injected ONLY into the temporary integration-test WAR, never the production WAR. */
@Alternative @Priority(1) @ApplicationScoped
public class SecurityTestTranslationService implements TranslationService {
 public String translate(String text) {
  try { Files.writeString(Path.of(System.getenv("SECURITY_TEST_CALLS")),"call\n",StandardOpenOption.CREATE,StandardOpenOption.APPEND); }
  catch(java.io.IOException e) {throw new IllegalStateException("Test call tracking failed");}
  return "كيف داير اليوم؟";
 }
}
