package edu.miniproject;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.security.enterprise.credential.Credential;
import jakarta.security.enterprise.credential.UsernamePasswordCredential;
import jakarta.security.enterprise.identitystore.CredentialValidationResult;
import jakarta.security.enterprise.identitystore.IdentityStore;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Set;

/** Single development account. No account is usable without both environment values. */
@ApplicationScoped
public class TranslatorIdentityStore implements IdentityStore {
    private final String username;
    private final String password;

    public TranslatorIdentityStore() {
        this(System.getenv("TRANSLATOR_USERNAME"), System.getenv("TRANSLATOR_PASSWORD"));
    }

    TranslatorIdentityStore(String username, String password) {
        this.username = username;
        this.password = password;
    }

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof UsernamePasswordCredential supplied)) {
            return CredentialValidationResult.NOT_VALIDATED_RESULT;
        }
        if (username == null || username.isBlank() || username.contains(":")
                || password == null || password.isBlank()) {
            return CredentialValidationResult.INVALID_RESULT;
        }
        // Constant-time comparison of UTF-8 bytes; no custom password hashing algorithm.
        boolean userMatches = matches(username, supplied.getCaller());
        boolean passwordMatches = matches(password, supplied.getPasswordAsString());
        if (!(userMatches & passwordMatches)) return CredentialValidationResult.INVALID_RESULT;
        return new CredentialValidationResult(username, Set.of("translators"));
    }

    private static boolean matches(String expected, String supplied) {
        if (supplied == null) return false;
        byte[] left = expected.getBytes(StandardCharsets.UTF_8);
        byte[] right = supplied.getBytes(StandardCharsets.UTF_8);
        try { return MessageDigest.isEqual(left, right); }
        finally { Arrays.fill(left, (byte) 0); Arrays.fill(right, (byte) 0); }
    }
}
