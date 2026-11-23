
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error('Falta configurar Supabase para la ruta de usuarios.');

      return NextResponse.json(
        { error: 'Configuración del servidor incompleta.' },
        { status: 500 }
      );
    }

    const token = authorization.replace('Bearer ', '');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await userClient.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Sesión inválida.' },
        { status: 401 }
      );
    }

    const { data: isAdmin, error: adminError } =
      await userClient.rpc('is_platform_admin');

    if (adminError || !isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permisos de superadministrador.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName = String(body.full_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    const institutionId = String(body.institution_id || '');
    const role = String(body.role || '');

    const validRoles = [
      'administration',
      'teacher',
      'guardian',
    ];

    if (
      !fullName ||
      !email ||
      !password ||
      !institutionId ||
      !validRoles.includes(role)
    ) {
      return NextResponse.json(
        { error: 'Completa todos los campos obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: institution, error: institutionError } =
      await adminClient
        .from('institutions')
        .select('id')
        .eq('id', institutionId)
        .maybeSingle();

        if (institutionError) {
        console.error('ERROR COMPLETO DE INSTITUCIÓN:', {
            message: institutionError.message,
            code: institutionError.code,
            details: institutionError.details,
            hint: institutionError.hint,
        });

        return NextResponse.json(
            {
            error: 'No se pudo verificar la institución.',
            details: institutionError.message,
            code: institutionError.code,
            },
            { status: 500 }
        );
        }

        if (!institution) {
        return NextResponse.json(
            { error: 'La institución no existe. Verifica el ID seleccionado.' },
            { status: 400 }
        );
        }

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phone || null,
        },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || 'No se pudo crear la cuenta.' },
        { status: 400 }
      );
    }

    const newUserId = created.user.id;

    const { error: profileError } = await adminClient
      .from('user_profiles')
      .upsert(
        {
          user_id: newUserId,
          full_name: fullName,
          phone: phone || null,
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { error: `Error al guardar el perfil: ${profileError.message}` },
        { status: 500 }
      );
    }

    const { error: membershipError } = await adminClient
      .from('memberships')
      .insert({
        institution_id: institutionId,
        user_id: newUserId,
        role,
        status: 'active',
      });

    if (membershipError) {
      await adminClient
        .from('user_profiles')
        .delete()
        .eq('user_id', newUserId);

      await adminClient.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { error: `Error al crear la membresía: ${membershipError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario creado correctamente.',
      user_id: newUserId,
    });

  } catch (error) {
    console.error('Error creando usuario:', error);

    return NextResponse.json(
      { error: 'Error interno al crear el usuario.' },
      { status: 500 }
    );
  }
}
