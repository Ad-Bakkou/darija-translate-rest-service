package edu.miniproject;
import jakarta.json.Json;
public record ErrorResponse(String error, String message) {
 public String json() { return Json.createObjectBuilder().add("error",error).add("message",message).build().toString(); }
}
