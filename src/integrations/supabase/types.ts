export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      area_entrega: {
        Row: {
          area_entrega: boolean | null
          cep: string | null
          created_at: string
          distancia: number | null
          distancia_maxima: number | null
          id: number
          session: string | null
          tempo_medio_entrega: string | null
          updated_at: string
          valor: number | null
          valor_frete: number | null
        }
        Insert: {
          area_entrega?: boolean | null
          cep?: string | null
          created_at?: string
          distancia?: number | null
          distancia_maxima?: number | null
          id?: number
          session?: string | null
          tempo_medio_entrega?: string | null
          updated_at?: string
          valor?: number | null
          valor_frete?: number | null
        }
        Update: {
          area_entrega?: boolean | null
          cep?: string | null
          created_at?: string
          distancia?: number | null
          distancia_maxima?: number | null
          id?: number
          session?: string | null
          tempo_medio_entrega?: string | null
          updated_at?: string
          valor?: number | null
          valor_frete?: number | null
        }
        Relationships: []
      }
      bebidas: {
        Row: {
          created_at: string
          disponivel: boolean
          id: number
          nome: string | null
          tamanho: string | null
          tipo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          disponivel?: boolean
          id?: number
          nome?: string | null
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          disponivel?: boolean
          id?: number
          nome?: string | null
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      borda_recheada: {
        Row: {
          created_at: string
          id: number
          tamanho_pizza: string | null
          updated_at: string
          valor_borda_recheada: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          tamanho_pizza?: string | null
          updated_at?: string
          valor_borda_recheada?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          tamanho_pizza?: string | null
          updated_at?: string
          valor_borda_recheada?: number | null
        }
        Relationships: []
      }
      cardapio: {
        Row: {
          additional_categories: string[] | null
          available: boolean | null
          borders_position: number | null
          category: string
          combination: Json | null
          cost: number | null
          created_at: string
          description: string
          display_order: number
          frete_gratis: boolean | null
          has_variations: boolean | null
          height_cm: number | null
          hidden_in_menu: boolean
          id: string
          image: string
          is_half_pizza: boolean | null
          length_cm: number | null
          max_sabores: number | null
          name: string
          permite_combinacao: boolean | null
          pizza_borders: Json | null
          pizza_sizes: Json
          popular: boolean | null
          price: number
          price_from: boolean | null
          sku: string | null
          stock: number | null
          submenu_description: string | null
          submenu_item_ids: string[]
          submenu_name: string | null
          tipo: string | null
          updated_at: string
          variation_groups: Json | null
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          additional_categories?: string[] | null
          available?: boolean | null
          borders_position?: number | null
          category: string
          combination?: Json | null
          cost?: number | null
          created_at?: string
          description?: string
          display_order?: number
          frete_gratis?: boolean | null
          has_variations?: boolean | null
          height_cm?: number | null
          hidden_in_menu?: boolean
          id: string
          image?: string
          is_half_pizza?: boolean | null
          length_cm?: number | null
          max_sabores?: number | null
          name: string
          permite_combinacao?: boolean | null
          pizza_borders?: Json | null
          pizza_sizes?: Json
          popular?: boolean | null
          price?: number
          price_from?: boolean | null
          sku?: string | null
          stock?: number | null
          submenu_description?: string | null
          submenu_item_ids?: string[]
          submenu_name?: string | null
          tipo?: string | null
          updated_at?: string
          variation_groups?: Json | null
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          additional_categories?: string[] | null
          available?: boolean | null
          borders_position?: number | null
          category?: string
          combination?: Json | null
          cost?: number | null
          created_at?: string
          description?: string
          display_order?: number
          frete_gratis?: boolean | null
          has_variations?: boolean | null
          height_cm?: number | null
          hidden_in_menu?: boolean
          id?: string
          image?: string
          is_half_pizza?: boolean | null
          length_cm?: number | null
          max_sabores?: number | null
          name?: string
          permite_combinacao?: boolean | null
          pizza_borders?: Json | null
          pizza_sizes?: Json
          popular?: boolean | null
          price?: number
          price_from?: boolean | null
          sku?: string | null
          stock?: number | null
          submenu_description?: string | null
          submenu_item_ids?: string[]
          submenu_name?: string | null
          tipo?: string | null
          updated_at?: string
          variation_groups?: Json | null
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      cardapio2: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          disponivel: boolean
          id: number
          id_original: string | null
          nome_do_prato: string | null
          preco: number | null
          updated_at: string
          url_image: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: number
          id_original?: string | null
          nome_do_prato?: string | null
          preco?: number | null
          updated_at?: string
          url_image?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: number
          id_original?: string | null
          nome_do_prato?: string | null
          preco?: number | null
          updated_at?: string
          url_image?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          aniversario: string | null
          area_entrega: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo: string | null
          complemento: string | null
          compras: number | null
          created_at: string
          distancia: number | null
          distancia_maxima: number | null
          estado: string | null
          id: number
          nome: string | null
          numero: string | null
          rua: string | null
          status: string | null
          total_gasto: number | null
          ultima_atualizacao: string | null
          ultima_compra: string | null
          ultimo_pedido: string | null
          updated_at: string
          valor_frete: number | null
          whatsapp: string | null
        }
        Insert: {
          aniversario?: string | null
          area_entrega?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          compras?: number | null
          created_at?: string
          distancia?: number | null
          distancia_maxima?: number | null
          estado?: string | null
          id?: number
          nome?: string | null
          numero?: string | null
          rua?: string | null
          status?: string | null
          total_gasto?: number | null
          ultima_atualizacao?: string | null
          ultima_compra?: string | null
          ultimo_pedido?: string | null
          updated_at?: string
          valor_frete?: number | null
          whatsapp?: string | null
        }
        Update: {
          aniversario?: string | null
          area_entrega?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          compras?: number | null
          created_at?: string
          distancia?: number | null
          distancia_maxima?: number | null
          estado?: string | null
          id?: number
          nome?: string | null
          numero?: string | null
          rua?: string | null
          status?: string | null
          total_gasto?: number | null
          ultima_atualizacao?: string | null
          ultima_compra?: string | null
          ultimo_pedido?: string | null
          updated_at?: string
          valor_frete?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      clientes_clickflow: {
        Row: {
          aniversario: string | null
          aniversario_timestamp: string | null
          created_at: string
          data_cadastro: string | null
          data_envio_rec: string | null
          id: number
          ja_enviado: string | null
          mensagem_enviada_clickflow: string | null
          msg1_aniversario_data_envio: string | null
          msg1_aniversario_enviada: string | null
          msg2_aniversario_data_envio: string | null
          msg2_aniversario_enviada: string | null
          msg3_aniversario_data_envio: string | null
          msg3_aniversario_enviada: string | null
          nome: string | null
          observacoes: string | null
          opt_out: boolean | null
          pedidos: string | null
          promocao_enviada_clickflow: string | null
          session: string | null
          taxa: string | null
          ultimo_contato_date: string | null
          ultimo_contato_time: string | null
          ultimo_envio: string | null
          ultimo_pedido: string | null
          ultimo_pedido_timestamp: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          aniversario?: string | null
          aniversario_timestamp?: string | null
          created_at?: string
          data_cadastro?: string | null
          data_envio_rec?: string | null
          id?: number
          ja_enviado?: string | null
          mensagem_enviada_clickflow?: string | null
          msg1_aniversario_data_envio?: string | null
          msg1_aniversario_enviada?: string | null
          msg2_aniversario_data_envio?: string | null
          msg2_aniversario_enviada?: string | null
          msg3_aniversario_data_envio?: string | null
          msg3_aniversario_enviada?: string | null
          nome?: string | null
          observacoes?: string | null
          opt_out?: boolean | null
          pedidos?: string | null
          promocao_enviada_clickflow?: string | null
          session?: string | null
          taxa?: string | null
          ultimo_contato_date?: string | null
          ultimo_contato_time?: string | null
          ultimo_envio?: string | null
          ultimo_pedido?: string | null
          ultimo_pedido_timestamp?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          aniversario?: string | null
          aniversario_timestamp?: string | null
          created_at?: string
          data_cadastro?: string | null
          data_envio_rec?: string | null
          id?: number
          ja_enviado?: string | null
          mensagem_enviada_clickflow?: string | null
          msg1_aniversario_data_envio?: string | null
          msg1_aniversario_enviada?: string | null
          msg2_aniversario_data_envio?: string | null
          msg2_aniversario_enviada?: string | null
          msg3_aniversario_data_envio?: string | null
          msg3_aniversario_enviada?: string | null
          nome?: string | null
          observacoes?: string | null
          opt_out?: boolean | null
          pedidos?: string | null
          promocao_enviada_clickflow?: string | null
          session?: string | null
          taxa?: string | null
          ultimo_contato_date?: string | null
          ultimo_contato_time?: string | null
          ultimo_envio?: string | null
          ultimo_pedido?: string | null
          ultimo_pedido_timestamp?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes_goodzap: {
        Row: {
          created_at: string
          distancia_maxima: number | null
          goodzap_status: string | null
          id: number
          model: string | null
          session: string | null
          tempo_atraso_minutos: number | null
          tempo_entrega_minutos: number | null
          tempo_resposta_minutos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          distancia_maxima?: number | null
          goodzap_status?: string | null
          id?: number
          model?: string | null
          session?: string | null
          tempo_atraso_minutos?: number | null
          tempo_entrega_minutos?: number | null
          tempo_resposta_minutos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          distancia_maxima?: number | null
          goodzap_status?: string | null
          id?: number
          model?: string | null
          session?: string | null
          tempo_atraso_minutos?: number | null
          tempo_entrega_minutos?: number | null
          tempo_resposta_minutos?: number
          updated_at?: string
        }
        Relationships: []
      }
      empresa_info: {
        Row: {
          bairro_empresa: string | null
          cep_empresa: string | null
          cidade_empresa: string | null
          created_at: string
          id: number
          nome_empresa: string | null
          numero_empresa: string | null
          rua_empresa: string | null
          telefone_empresa: string | null
          updated_at: string
          whatsapp_empresa: string | null
        }
        Insert: {
          bairro_empresa?: string | null
          cep_empresa?: string | null
          cidade_empresa?: string | null
          created_at?: string
          id?: number
          nome_empresa?: string | null
          numero_empresa?: string | null
          rua_empresa?: string | null
          telefone_empresa?: string | null
          updated_at?: string
          whatsapp_empresa?: string | null
        }
        Update: {
          bairro_empresa?: string | null
          cep_empresa?: string | null
          cidade_empresa?: string | null
          created_at?: string
          id?: number
          nome_empresa?: string | null
          numero_empresa?: string | null
          rua_empresa?: string | null
          telefone_empresa?: string | null
          updated_at?: string
          whatsapp_empresa?: string | null
        }
        Relationships: []
      }
      faixas_frete: {
        Row: {
          created_at: string | null
          id: string
          km_final: number
          km_inicial: number
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          km_final: number
          km_inicial: number
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string | null
          id?: string
          km_final?: number
          km_inicial?: number
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      goodzap_sistema: {
        Row: {
          atendimento_segundos: number
          comunicacao_apikey: string
          created_at: string
          debounce_segundos: number
          id: boolean
          instancia: string
          updated_at: string
        }
        Insert: {
          atendimento_segundos?: number
          comunicacao_apikey?: string
          created_at?: string
          debounce_segundos?: number
          id?: boolean
          instancia?: string
          updated_at?: string
        }
        Update: {
          atendimento_segundos?: number
          comunicacao_apikey?: string
          created_at?: string
          debounce_segundos?: number
          id?: boolean
          instancia?: string
          updated_at?: string
        }
        Relationships: []
      }
      horario_empresa_goodzap: {
        Row: {
          abre_as: string
          ativo: boolean
          created_at: string
          dia_semana_id: number
          dia_semana_nome: string
          fecha_as: string
          updated_at: string
        }
        Insert: {
          abre_as?: string
          ativo?: boolean
          created_at?: string
          dia_semana_id: number
          dia_semana_nome: string
          fecha_as?: string
          updated_at?: string
        }
        Update: {
          abre_as?: string
          ativo?: boolean
          created_at?: string
          dia_semana_id?: number
          dia_semana_nome?: string
          fecha_as?: string
          updated_at?: string
        }
        Relationships: []
      }
      horarios_goodzap: {
        Row: {
          ativa: boolean | null
          created_at: string
          detalhes: string | null
          horario: string
          id: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          detalhes?: string | null
          horario: string
          id?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          detalhes?: string | null
          horario?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      keep_alive: {
        Row: {
          check: string | null
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          check?: string | null
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          check?: string | null
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      numeros_especiais: {
        Row: {
          created_at: string
          id: number
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
          telefone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      outros_produtos: {
        Row: {
          created_at: string
          descricao: string | null
          disponivel: boolean | null
          id: number
          produto: string | null
          tipo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean | null
          id?: number
          produto?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean | null
          id?: number
          produto?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      pedidos_goodzap: {
        Row: {
          cep: string | null
          codigo_pedido: string
          created_at: string
          criado_em: string | null
          empresa: string | null
          endereco: string
          id: number
          nome: string
          observacoes: string | null
          pagamento: string | null
          pedido: string
          sessao: string
          total: string
          ultimo_envio: string | null
          ultimo_pedido: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cep?: string | null
          codigo_pedido: string
          created_at?: string
          criado_em?: string | null
          empresa?: string | null
          endereco: string
          id?: number
          nome: string
          observacoes?: string | null
          pagamento?: string | null
          pedido: string
          sessao: string
          total: string
          ultimo_envio?: string | null
          ultimo_pedido?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          cep?: string | null
          codigo_pedido?: string
          created_at?: string
          criado_em?: string | null
          empresa?: string | null
          endereco?: string
          id?: number
          nome?: string
          observacoes?: string | null
          pagamento?: string | null
          pedido?: string
          sessao?: string
          total?: string
          ultimo_envio?: string | null
          ultimo_pedido?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promocao_aniversario: {
        Row: {
          agendamento_ativo: boolean
          agendamento_data_final: string | null
          agendamento_data_inicio: string | null
          agendamento_dias_semana: number[] | null
          agendamento_horarios: string[] | null
          agendamento_timezone: string
          agendamento_tipo: string | null
          created_at: string
          enviado: string | null
          id: number
          imagem_1_ativa: boolean
          imagem_1_url: string | null
          imagem_2_ativa: boolean
          imagem_2_url: string | null
          imagem_3_ativa: boolean
          imagem_3_url: string | null
          legenda_1: string | null
          legenda_2: string | null
          legenda_3: string | null
          mensagem_1: string | null
          mensagem_2: string | null
          mensagem_3: string | null
          next_run_at: string | null
          quant_msg: number | null
          status: string | null
          ultimo_disparo_at: string | null
          updated_at: string
        }
        Insert: {
          agendamento_ativo?: boolean
          agendamento_data_final?: string | null
          agendamento_data_inicio?: string | null
          agendamento_dias_semana?: number[] | null
          agendamento_horarios?: string[] | null
          agendamento_timezone?: string
          agendamento_tipo?: string | null
          created_at?: string
          enviado?: string | null
          id?: number
          imagem_1_ativa?: boolean
          imagem_1_url?: string | null
          imagem_2_ativa?: boolean
          imagem_2_url?: string | null
          imagem_3_ativa?: boolean
          imagem_3_url?: string | null
          legenda_1?: string | null
          legenda_2?: string | null
          legenda_3?: string | null
          mensagem_1?: string | null
          mensagem_2?: string | null
          mensagem_3?: string | null
          next_run_at?: string | null
          quant_msg?: number | null
          status?: string | null
          ultimo_disparo_at?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_ativo?: boolean
          agendamento_data_final?: string | null
          agendamento_data_inicio?: string | null
          agendamento_dias_semana?: number[] | null
          agendamento_horarios?: string[] | null
          agendamento_timezone?: string
          agendamento_tipo?: string | null
          created_at?: string
          enviado?: string | null
          id?: number
          imagem_1_ativa?: boolean
          imagem_1_url?: string | null
          imagem_2_ativa?: boolean
          imagem_2_url?: string | null
          imagem_3_ativa?: boolean
          imagem_3_url?: string | null
          legenda_1?: string | null
          legenda_2?: string | null
          legenda_3?: string | null
          mensagem_1?: string | null
          mensagem_2?: string | null
          mensagem_3?: string | null
          next_run_at?: string | null
          quant_msg?: number | null
          status?: string | null
          ultimo_disparo_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promocoes_goodzap: {
        Row: {
          agendamento_ativo: boolean
          agendamento_data_final: string | null
          agendamento_data_inicio: string | null
          agendamento_dias_semana: number[] | null
          agendamento_horarios: string[] | null
          agendamento_timezone: string
          agendamento_tipo: string | null
          ativa: boolean | null
          created_at: string
          id: number
          imagem_ativa: boolean
          imagem_promocao: string | null
          imagem_url: string | null
          legenda: string | null
          next_run_at: string | null
          promocao: string
          regras: string | null
          ultimo_disparo_at: string | null
          updated_at: string
        }
        Insert: {
          agendamento_ativo?: boolean
          agendamento_data_final?: string | null
          agendamento_data_inicio?: string | null
          agendamento_dias_semana?: number[] | null
          agendamento_horarios?: string[] | null
          agendamento_timezone?: string
          agendamento_tipo?: string | null
          ativa?: boolean | null
          created_at?: string
          id?: number
          imagem_ativa?: boolean
          imagem_promocao?: string | null
          imagem_url?: string | null
          legenda?: string | null
          next_run_at?: string | null
          promocao: string
          regras?: string | null
          ultimo_disparo_at?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_ativo?: boolean
          agendamento_data_final?: string | null
          agendamento_data_inicio?: string | null
          agendamento_dias_semana?: number[] | null
          agendamento_horarios?: string[] | null
          agendamento_timezone?: string
          agendamento_tipo?: string | null
          ativa?: boolean | null
          created_at?: string
          id?: number
          imagem_ativa?: boolean
          imagem_promocao?: string | null
          imagem_url?: string | null
          legenda?: string | null
          next_run_at?: string | null
          promocao?: string
          regras?: string | null
          ultimo_disparo_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recuperacao_clientes: {
        Row: {
          agendamento_ativo: boolean
          agendamento_data_final: string | null
          agendamento_data_inicio: string | null
          agendamento_dias_semana: number[] | null
          agendamento_horarios: string[] | null
          agendamento_timezone: string
          agendamento_tipo: string | null
          ativa_promocao: string | null
          created_at: string
          data_final: string | null
          data_inicio: string | null
          id: number
          imagem_1_ativa: boolean
          imagem_1_url: string | null
          imagem_2_ativa: boolean
          imagem_2_url: string | null
          imagem_3_ativa: boolean
          imagem_3_url: string | null
          imagem_ativa: boolean
          imagem_url: string | null
          legenda: string | null
          legenda_1: string | null
          legenda_2: string | null
          legenda_3: string | null
          legenda_ativa: boolean
          mensagem: string | null
          mensagem_2: string | null
          mensagem_3: string | null
          mensagem_ativa: boolean
          mensagens: Json
          next_run_at: string | null
          promocao: string | null
          prox_msg: number | null
          quant_msg: number
          regras: string | null
          status: string | null
          ultimo_disparo_at: string | null
          updated_at: string
        }
        Insert: {
          agendamento_ativo?: boolean
          agendamento_data_final?: string | null
          agendamento_data_inicio?: string | null
          agendamento_dias_semana?: number[] | null
          agendamento_horarios?: string[] | null
          agendamento_timezone?: string
          agendamento_tipo?: string | null
          ativa_promocao?: string | null
          created_at?: string
          data_final?: string | null
          data_inicio?: string | null
          id?: number
          imagem_1_ativa?: boolean
          imagem_1_url?: string | null
          imagem_2_ativa?: boolean
          imagem_2_url?: string | null
          imagem_3_ativa?: boolean
          imagem_3_url?: string | null
          imagem_ativa?: boolean
          imagem_url?: string | null
          legenda?: string | null
          legenda_1?: string | null
          legenda_2?: string | null
          legenda_3?: string | null
          legenda_ativa?: boolean
          mensagem?: string | null
          mensagem_2?: string | null
          mensagem_3?: string | null
          mensagem_ativa?: boolean
          mensagens?: Json
          next_run_at?: string | null
          promocao?: string | null
          prox_msg?: number | null
          quant_msg?: number
          regras?: string | null
          status?: string | null
          ultimo_disparo_at?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_ativo?: boolean
          agendamento_data_final?: string | null
          agendamento_data_inicio?: string | null
          agendamento_dias_semana?: number[] | null
          agendamento_horarios?: string[] | null
          agendamento_timezone?: string
          agendamento_tipo?: string | null
          ativa_promocao?: string | null
          created_at?: string
          data_final?: string | null
          data_inicio?: string | null
          id?: number
          imagem_1_ativa?: boolean
          imagem_1_url?: string | null
          imagem_2_ativa?: boolean
          imagem_2_url?: string | null
          imagem_3_ativa?: boolean
          imagem_3_url?: string | null
          imagem_ativa?: boolean
          imagem_url?: string | null
          legenda?: string | null
          legenda_1?: string | null
          legenda_2?: string | null
          legenda_3?: string | null
          legenda_ativa?: boolean
          mensagem?: string | null
          mensagem_2?: string | null
          mensagem_3?: string | null
          mensagem_ativa?: boolean
          mensagens?: Json
          next_run_at?: string | null
          promocao?: string | null
          prox_msg?: number | null
          quant_msg?: number
          regras?: string | null
          status?: string | null
          ultimo_disparo_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          created_at: string
          data_reserva: string | null
          horario_reserva: string | null
          id: number
          nome: string | null
          observacoes: string | null
          qtde_pessoas: number | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          data_reserva?: string | null
          horario_reserva?: string | null
          id?: number
          nome?: string | null
          observacoes?: string | null
          qtde_pessoas?: number | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          data_reserva?: string | null
          horario_reserva?: string | null
          id?: number
          nome?: string | null
          observacoes?: string | null
          qtde_pessoas?: number | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      saudacoes_goodzap: {
        Row: {
          ativa: boolean | null
          created_at: string
          id: number
          saudacao: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          id?: number
          saudacao: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          id?: number
          saudacao?: string
          updated_at?: string
        }
        Relationships: []
      }
      telefones_admin_goodzap: {
        Row: {
          ativa: boolean | null
          created_at: string
          id: number
          numero_atendente: string | null
          numero_gerente: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          id?: number
          numero_atendente?: string | null
          numero_gerente?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          id?: number
          numero_atendente?: string | null
          numero_gerente?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
          token: string
          token_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          used: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          token: string
          token_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          used?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          token?: string
          token_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tokens_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhooks_campanhas: {
        Row: {
          comunicacao_instancia: string | null
          created_at: string
          id: number
          updated_at: string
          webhook_aniversariantes: string | null
          webhook_promocoes: string | null
          webhook_recuperacao: string | null
          webhook_reservas: string | null
        }
        Insert: {
          comunicacao_instancia?: string | null
          created_at?: string
          id?: number
          updated_at?: string
          webhook_aniversariantes?: string | null
          webhook_promocoes?: string | null
          webhook_recuperacao?: string | null
          webhook_reservas?: string | null
        }
        Update: {
          comunicacao_instancia?: string | null
          created_at?: string
          id?: number
          updated_at?: string
          webhook_aniversariantes?: string | null
          webhook_promocoes?: string | null
          webhook_recuperacao?: string | null
          webhook_reservas?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          contact_phone: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_type: string
          sender_user_id: string | null
          session_id: string
        }
        Insert: {
          contact_phone: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_type: string
          sender_user_id?: string | null
          session_id: string
        }
        Update: {
          contact_phone?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_type?: string
          sender_user_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      whatsapp_session_events: {
        Row: {
          attendant_id: string | null
          attendant_name: string
          created_at: string
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          attendant_id?: string | null
          attendant_name: string
          created_at?: string
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          attendant_id?: string | null
          attendant_name?: string
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          id: string
          paused_reason: string | null
          session_id: string
          status: string
          unread_count: number
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          id?: string
          paused_reason?: string | null
          session_id: string
          status?: string
          unread_count?: number
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          id?: string
          paused_reason?: string | null
          session_id?: string
          status?: string
          unread_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role_from_token: {
        Args: { _token: string; _user_id: string }
        Returns: undefined
      }
      atualizar_metricas_clientes: { Args: never; Returns: undefined }
      buscar_configuracoes_goodzap: { Args: never; Returns: Json }
      buscar_disparos_prontos: {
        Args: { p_limite?: number }
        Returns: {
          dados: Json
          id: number
          next_run_at: string
          origem: string
        }[]
      }
      calcular_next_run_at: {
        Args: {
          p_ativo: boolean
          p_data_final: string
          p_data_inicio: string
          p_dias_semana: number[]
          p_horarios: string[]
          p_timezone: string
          p_tipo: string
        }
        Returns: string
      }
      complete_registration_token: {
        Args: { _token_id: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      salvar_goodzap_exclusivo: {
        Args: { p_dados?: Json; p_id?: number; p_tabela: string }
        Returns: number
      }
      update_session_auto_close: {
        Args: { p_check_minutes: number; p_idle_minutes: number }
        Returns: undefined
      }
      validate_registration_token: {
        Args: { _token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "attendant" | "admin" | "super-admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["attendant", "admin", "super-admin", "user"],
    },
  },
} as const
