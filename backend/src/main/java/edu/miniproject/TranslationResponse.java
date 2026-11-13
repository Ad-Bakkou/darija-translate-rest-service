package edu.miniproject;
import jakarta.json.Json;
public record TranslationResponse(String originalText, String translatedText, String sourceLanguage, String targetLanguage) {
 public String json() { return Json.createObjectBuilder().add("originalText",originalText).add("translatedText",translatedText).add("sourceLanguage",sourceLanguage).add("targetLanguage",targetLanguage).build().toString(); }
}
