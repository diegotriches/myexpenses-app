/**
 * ============================================
 * 🔐 PASSWORD VALIDATOR
 * ============================================
 * 
 * Validações reutilizáveis para senhas fortes.
 * 
 * Usado em:
 * - /api/auth/register (criação de conta)
 * - /api/auth/reset-password (redefinição)
 * - /api/auth/change-password (alteração - futuro)
 * 
 * Critérios de senha forte:
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 * 
 * ============================================
 */

/**
 * Resultado da validação de senha
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validações individuais de senha
 */
const PASSWORD_RULES = {
  minLength: {
    test: (password: string) => password.length >= 8,
    error: "A senha deve ter no mínimo 8 caracteres",
  },
  hasLowercase: {
    test: (password: string) => /[a-z]/.test(password),
    error: "A senha deve conter pelo menos uma letra minúscula",
  },
  hasUppercase: {
    test: (password: string) => /[A-Z]/.test(password),
    error: "A senha deve conter pelo menos uma letra maiúscula",
  },
  hasNumber: {
    test: (password: string) => /[0-9]/.test(password),
    error: "A senha deve conter pelo menos um número",
  },
  hasSpecialChar: {
    test: (password: string) => /[^a-zA-Z0-9]/.test(password),
    error: "A senha deve conter pelo menos um caractere especial (!@#$%^&*)",
  },
} as const;

/**
 * Valida se a senha atende aos critérios de segurança
 * 
 * @param password - Senha a ser validada
 * @returns Objeto com resultado da validação e mensagem de erro (se houver)
 * 
 * @example
 * ```typescript
 * const result = validatePassword("Senha123!");
 * if (!result.valid) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Verificar se senha foi fornecida
  if (!password || typeof password !== "string") {
    return {
      valid: false,
      error: "Senha é obrigatória",
    };
  }

  // Verificar cada regra em ordem
  for (const rule of Object.values(PASSWORD_RULES)) {
    if (!rule.test(password)) {
      return {
        valid: false,
        error: rule.error,
      };
    }
  }

  // Todas as validações passaram
  return {
    valid: true,
  };
}

/**
 * Valida senha e retorna erro se inválida (helper para uso com throw)
 * 
 * @param password - Senha a ser validada
 * @throws Error se senha for inválida
 * 
 * @example
 * ```typescript
 * try {
 *   validatePasswordOrThrow("Senha123!");
 *   // Continua apenas se senha for válida
 * } catch (error) {
 *   return NextResponse.json({ error: error.message }, { status: 400 });
 * }
 * ```
 */
export function validatePasswordOrThrow(password: string): void {
  const result = validatePassword(password);
  if (!result.valid) {
    throw new Error(result.error);
  }
}

/**
 * Obtém força da senha (0-5)
 * 
 * @param password - Senha a ser avaliada
 * @returns Número de 0 a 5 representando a força
 * 
 * @example
 * ```typescript
 * const strength = getPasswordStrength("Senha123!");
 * console.log(strength); // 5 (todas as regras atendidas)
 * ```
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  for (const rule of Object.values(PASSWORD_RULES)) {
    if (rule.test(password)) {
      strength++;
    }
  }

  return strength;
}

/**
 * Obtém descrição da força da senha
 * 
 * @param password - Senha a ser avaliada
 * @returns String descritiva da força
 * 
 * @example
 * ```typescript
 * const description = getPasswordStrengthDescription("abc");
 * console.log(description); // "Muito fraca"
 * ```
 */
export function getPasswordStrengthDescription(password: string): string {
  const strength = getPasswordStrength(password);

  switch (strength) {
    case 0:
    case 1:
      return "Muito fraca";
    case 2:
      return "Fraca";
    case 3:
      return "Média";
    case 4:
      return "Forte";
    case 5:
      return "Muito forte";
    default:
      return "Desconhecida";
  }
}

/**
 * Lista todos os critérios que a senha não atende
 * 
 * @param password - Senha a ser avaliada
 * @returns Array com mensagens de erro dos critérios não atendidos
 * 
 * @example
 * ```typescript
 * const errors = getPasswordErrors("abc");
 * console.log(errors);
 * // [
 * //   "A senha deve ter no mínimo 8 caracteres",
 * //   "A senha deve conter pelo menos uma letra maiúscula",
 * //   "A senha deve conter pelo menos um número",
 * //   "A senha deve conter pelo menos um caractere especial (!@#$%^&*)"
 * // ]
 * ```
 */
export function getPasswordErrors(password: string): string[] {
  if (!password) {
    return ["Senha é obrigatória"];
  }

  const errors: string[] = [];

  for (const rule of Object.values(PASSWORD_RULES)) {
    if (!rule.test(password)) {
      errors.push(rule.error);
    }
  }

  return errors;
}

// ============================================
// 📚 EXEMPLOS DE USO
// ============================================

/*
// ✅ Uso básico em API Route
const result = validatePassword(password);
if (!result.valid) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

// ✅ Uso com throw (mais conciso)
try {
  validatePasswordOrThrow(password);
  // Continua apenas se válida
} catch (error) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}

// ✅ Feedback para UI (frontend)
const strength = getPasswordStrength(password);
const description = getPasswordStrengthDescription(password);
console.log(`Força: ${strength}/5 - ${description}`);

// ✅ Lista de erros para formulário
const errors = getPasswordErrors(password);
if (errors.length > 0) {
  return { errors };
}
*/