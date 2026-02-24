import { z } from 'zod'

/**
 * Schemas de validação para endpoints admin.
 * Centralizados para reutilização e consistência.
 */

export const createUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    phone: z.string().optional(),
    role: z.enum(['admin', 'user']).default('user')
})

export const updateUserSchema = z.object({
    id: z.string().uuid('ID de usuário inválido'),
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    phone: z.string().optional(),
    role: z.enum(['admin', 'user']).optional()
})

export const deleteUserSchema = z.object({
    id: z.string().uuid('ID de usuário inválido')
})

export const updateRoleSchema = z.object({
    userId: z.string().uuid('ID de usuário inválido'),
    role: z.enum(['admin', 'user'], { message: 'Cargo deve ser admin ou user' })
})

export const settingsSchema = z.object({
    service_hours: z.object({
        start: z.string(),
        end: z.string(),
        active: z.boolean()
    }).optional(),
    welcome_message: z.string().max(1000).optional(),
    bot_notices: z.string().max(5000).optional()
})
