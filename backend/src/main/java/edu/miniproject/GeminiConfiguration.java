package edu.miniproject;
import java.net.URI;
import java.time.Duration;
public final class GeminiConfiguration {
 private final String key; private final String model;
 public GeminiConfiguration(String key,String model) { this.key=key; this.model=model==null || model.isBlank()?"gemini-2.5-flash":model; }
 public static GeminiConfiguration environment() { return new GeminiConfiguration(System.getenv("GEMINI_API_KEY"),System.getenv("GEMINI_MODEL")); }
 public String diagnosticModel() { return model.matches("[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}") ? model : "INVALID"; }
 public boolean hasCredentials() { return key!=null && !key.isBlank(); }
 public String apiKey() { validate(); return key; }
 public URI endpoint() { validate(); return URI.create("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent"); }
 public void validate() {
  if(key==null || key.isBlank()) throw new ApiException(503,"CONFIGURATION_ERROR","Translation service credentials are not configured.");
  if(!model.matches("[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}") || key.chars().anyMatch(c -> c<33 || c>126)) throw new ApiException(503,"CONFIGURATION_ERROR","Translation service configuration is invalid.");
 }
 public static final Duration CONNECT_TIMEOUT=Duration.ofSeconds(10), REQUEST_TIMEOUT=Duration.ofSeconds(45);
}
