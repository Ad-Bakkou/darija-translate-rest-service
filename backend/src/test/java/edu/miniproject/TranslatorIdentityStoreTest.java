package edu.miniproject;
import jakarta.security.enterprise.credential.UsernamePasswordCredential;
import jakarta.security.enterprise.identitystore.CredentialValidationResult.Status;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
class TranslatorIdentityStoreTest {
 @Test void validCredentialsAndGroup() {
  var result=new TranslatorIdentityStore("test-user","test-password").validate(new UsernamePasswordCredential("test-user","test-password"));
  assertEquals(Status.VALID,result.getStatus());assertTrue(result.getCallerGroups().contains("translators"));
 }
 @Test void wrongUsername(){assertEquals(Status.INVALID,new TranslatorIdentityStore("test-user","test-password").validate(new UsernamePasswordCredential("other","test-password")).getStatus());}
 @Test void wrongPassword(){assertEquals(Status.INVALID,new TranslatorIdentityStore("test-user","test-password").validate(new UsernamePasswordCredential("test-user","wrong")).getStatus());}
 @ParameterizedTest @NullAndEmptySource @ValueSource(strings={" ","\t"}) void absentPassword(String value){assertEquals(Status.INVALID,new TranslatorIdentityStore("test-user",value).validate(new UsernamePasswordCredential("test-user", "")).getStatus());}
 @ParameterizedTest @NullAndEmptySource @ValueSource(strings={" ","bad:name"}) void absentUsername(String value){assertEquals(Status.INVALID,new TranslatorIdentityStore(value,"test-password").validate(new UsernamePasswordCredential("test-user", "test-password")).getStatus());}
}
