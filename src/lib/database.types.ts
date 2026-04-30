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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acio_deal_emails: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          last_message_date: string | null
          participants: Json | null
          snippet: string | null
          subject: string | null
          thread_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          last_message_date?: string | null
          participants?: Json | null
          snippet?: string | null
          subject?: string | null
          thread_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          last_message_date?: string | null
          participants?: Json | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acio_deal_emails_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "acio_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      acio_deals: {
        Row: {
          company_description: string | null
          company_name: string
          company_stage: string | null
          created_at: string | null
          created_by_user_id: string | null
          deal_type: string | null
          first_contacted_at: string | null
          first_seen_at: string | null
          id: string
          industry: string | null
          key_contacts: Json | null
          last_contacted_at: string | null
          last_edited_at: string | null
          last_edited_by_user_id: string | null
          memo_filename: string | null
          memo_url: string | null
          notes: string | null
          priority: string | null
          reminder_date: string | null
          reminder_note: string | null
          source: string | null
          source_subject: string | null
          source_thread_id: string | null
          stage: string
          stage_updated_at: string | null
          status: string | null
          updated_at: string | null
          value_proposition: string | null
          vehicle: string | null
        }
        Insert: {
          company_description?: string | null
          company_name: string
          company_stage?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deal_type?: string | null
          first_contacted_at?: string | null
          first_seen_at?: string | null
          id?: string
          industry?: string | null
          key_contacts?: Json | null
          last_contacted_at?: string | null
          last_edited_at?: string | null
          last_edited_by_user_id?: string | null
          memo_filename?: string | null
          memo_url?: string | null
          notes?: string | null
          priority?: string | null
          reminder_date?: string | null
          reminder_note?: string | null
          source?: string | null
          source_subject?: string | null
          source_thread_id?: string | null
          stage?: string
          stage_updated_at?: string | null
          status?: string | null
          updated_at?: string | null
          value_proposition?: string | null
          vehicle?: string | null
        }
        Update: {
          company_description?: string | null
          company_name?: string
          company_stage?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deal_type?: string | null
          first_contacted_at?: string | null
          first_seen_at?: string | null
          id?: string
          industry?: string | null
          key_contacts?: Json | null
          last_contacted_at?: string | null
          last_edited_at?: string | null
          last_edited_by_user_id?: string | null
          memo_filename?: string | null
          memo_url?: string | null
          notes?: string | null
          priority?: string | null
          reminder_date?: string | null
          reminder_note?: string | null
          source?: string | null
          source_subject?: string | null
          source_thread_id?: string | null
          stage?: string
          stage_updated_at?: string | null
          status?: string | null
          updated_at?: string | null
          value_proposition?: string | null
          vehicle?: string | null
        }
        Relationships: []
      }
      acio_email_attachments: {
        Row: {
          created_at: string | null
          deal_email_id: string | null
          deal_id: string
          filename: string
          gmail_attachment_id: string
          gmail_message_id: string
          id: string
          mime_type: string
          size: number
        }
        Insert: {
          created_at?: string | null
          deal_email_id?: string | null
          deal_id: string
          filename: string
          gmail_attachment_id: string
          gmail_message_id: string
          id?: string
          mime_type?: string
          size?: number
        }
        Update: {
          created_at?: string | null
          deal_email_id?: string | null
          deal_id?: string
          filename?: string
          gmail_attachment_id?: string
          gmail_message_id?: string
          id?: string
          mime_type?: string
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "acio_email_attachments_deal_email_id_fkey"
            columns: ["deal_email_id"]
            isOneToOne: false
            referencedRelation: "acio_deal_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acio_email_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "acio_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      acio_email_messages: {
        Row: {
          body_text: string | null
          created_at: string | null
          date: string | null
          deal_email_id: string
          from_email: string | null
          from_name: string | null
          id: string
          message_id: string
          snippet: string | null
          subject: string | null
        }
        Insert: {
          body_text?: string | null
          created_at?: string | null
          date?: string | null
          deal_email_id: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          message_id: string
          snippet?: string | null
          subject?: string | null
        }
        Update: {
          body_text?: string | null
          created_at?: string | null
          date?: string | null
          deal_email_id?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          message_id?: string
          snippet?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acio_email_messages_deal_email_id_fkey"
            columns: ["deal_email_id"]
            isOneToOne: false
            referencedRelation: "acio_deal_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      acio_scan_log: {
        Row: {
          id: string
          new_deals_found: number | null
          query_used: string | null
          scan_type: string
          scanned_at: string | null
          threads_scanned: number | null
        }
        Insert: {
          id?: string
          new_deals_found?: number | null
          query_used?: string | null
          scan_type: string
          scanned_at?: string | null
          threads_scanned?: number | null
        }
        Update: {
          id?: string
          new_deals_found?: number | null
          query_used?: string | null
          scan_type?: string
          scanned_at?: string | null
          threads_scanned?: number | null
        }
        Relationships: []
      }
      action_item_tags: {
        Row: {
          action_item_id: string
          created_at: string
          tag: string
        }
        Insert: {
          action_item_id: string
          created_at?: string
          tag: string
        }
        Update: {
          action_item_id?: string
          created_at?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_item_tags_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      action_items: {
        Row: {
          category: string | null
          completed_at: string | null
          confidence: number | null
          created_at: string
          description: string | null
          due_date: string | null
          embedding: string | null
          id: string
          interaction_id: string
          owner_person_id: string | null
          priority: Database["public"]["Enums"]["oig_priority"] | null
          requested_by_person_id: string | null
          status: Database["public"]["Enums"]["oig_action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          embedding?: string | null
          id?: string
          interaction_id: string
          owner_person_id?: string | null
          priority?: Database["public"]["Enums"]["oig_priority"] | null
          requested_by_person_id?: string | null
          status?: Database["public"]["Enums"]["oig_action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          embedding?: string | null
          id?: string
          interaction_id?: string
          owner_person_id?: string | null
          priority?: Database["public"]["Enums"]["oig_priority"] | null
          requested_by_person_id?: string | null
          status?: Database["public"]["Enums"]["oig_action_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_requested_by_person_id_fkey"
            columns: ["requested_by_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_slug: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          agent_slug: string
          content: string
          filename: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_slug: string
          content?: string
          filename: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_slug?: string
          content?: string
          filename?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content_json: Json
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content_json: Json
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content_json?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_permissions: {
        Row: {
          agent_slug: string
          created_at: string
          enabled: boolean
          user_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string
          enabled?: boolean
          user_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string
          enabled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      ai_initiatives: {
        Row: {
          business_segment: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          linked_proposals: string[] | null
          linked_skills: string[] | null
          priority: string | null
          progress_notes: string | null
          requirements: string | null
          status: string | null
          summary: string | null
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_segment?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          linked_proposals?: string[] | null
          linked_skills?: string[] | null
          priority?: string | null
          progress_notes?: string | null
          requirements?: string | null
          status?: string | null
          summary?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_segment?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          linked_proposals?: string[] | null
          linked_skills?: string[] | null
          priority?: string | null
          progress_notes?: string | null
          requirements?: string | null
          status?: string | null
          summary?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_findings: {
        Row: {
          created_at: string
          details: string | null
          finding_type: string
          id: string
          related_action_item_id: string | null
          related_interaction_id: string | null
          related_org_id: string | null
          related_person_id: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["oig_audit_severity"]
          title: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          finding_type: string
          id?: string
          related_action_item_id?: string | null
          related_interaction_id?: string | null
          related_org_id?: string | null
          related_person_id?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["oig_audit_severity"]
          title: string
        }
        Update: {
          created_at?: string
          details?: string | null
          finding_type?: string
          id?: string
          related_action_item_id?: string | null
          related_interaction_id?: string | null
          related_org_id?: string | null
          related_person_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["oig_audit_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_related_action_item_id_fkey"
            columns: ["related_action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_related_interaction_id_fkey"
            columns: ["related_interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_related_org_id_fkey"
            columns: ["related_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_related_person_id_fkey"
            columns: ["related_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      collateral_metadata: {
        Row: {
          created_at: string | null
          display_title: string | null
          dropbox_path: string
          id: string
          illustrates: string | null
          updated_at: string | null
          use_case: string | null
          why_care: string | null
        }
        Insert: {
          created_at?: string | null
          display_title?: string | null
          dropbox_path: string
          id?: string
          illustrates?: string | null
          updated_at?: string | null
          use_case?: string | null
          why_care?: string | null
        }
        Update: {
          created_at?: string | null
          display_title?: string | null
          dropbox_path?: string
          id?: string
          illustrates?: string | null
          updated_at?: string | null
          use_case?: string | null
          why_care?: string | null
        }
        Relationships: []
      }
      collateral_metadata_history: {
        Row: {
          created_at: string | null
          display_title: string | null
          dropbox_path: string
          id: string
          illustrates: string | null
          use_case: string | null
          why_care: string | null
        }
        Insert: {
          created_at?: string | null
          display_title?: string | null
          dropbox_path: string
          id?: string
          illustrates?: string | null
          use_case?: string | null
          why_care?: string | null
        }
        Update: {
          created_at?: string | null
          display_title?: string | null
          dropbox_path?: string
          id?: string
          illustrates?: string | null
          use_case?: string | null
          why_care?: string | null
        }
        Relationships: []
      }
      context_tree_cache: {
        Row: {
          id: string
          tree_json: Json
          updated_at: string
        }
        Insert: {
          id?: string
          tree_json?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          tree_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      fund_allocations: {
        Row: {
          effective_date: string
          fund_id: string
          id: string
          portfolio: string
          weight_pct: number | null
        }
        Insert: {
          effective_date: string
          fund_id: string
          id?: string
          portfolio: string
          weight_pct?: number | null
        }
        Update: {
          effective_date?: string
          fund_id?: string
          id?: string
          portfolio?: string
          weight_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_returns: {
        Row: {
          as_of_date: string
          audit_url: string | null
          created_at: string
          fund_id: string | null
          fund_key: string
          fund_name: string
          gmail_link: string | null
          gross_net: string
          id: string
          return_month: string
          return_type: string
          return_value: number
          share_class: string
          source_email_date: string | null
          source_email_id: string | null
          source_type: string
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          as_of_date: string
          audit_url?: string | null
          created_at?: string
          fund_id?: string | null
          fund_key: string
          fund_name: string
          gmail_link?: string | null
          gross_net?: string
          id?: string
          return_month: string
          return_type: string
          return_value: number
          share_class: string
          source_email_date?: string | null
          source_email_id?: string | null
          source_type: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          as_of_date?: string
          audit_url?: string | null
          created_at?: string
          fund_id?: string | null
          fund_key?: string
          fund_name?: string
          gmail_link?: string | null
          gross_net?: string
          id?: string
          return_month?: string
          return_type?: string
          return_value?: number
          share_class?: string
          source_email_date?: string | null
          source_email_id?: string | null
          source_type?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_returns_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          active: boolean
          created_at: string
          extraction_notes: string | null
          id: string
          name: string
          nav_sheet: string
          portfolio_model_row: number | null
          sender_email: string | null
          share_class: string
          source_channel: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          extraction_notes?: string | null
          id?: string
          name: string
          nav_sheet: string
          portfolio_model_row?: number | null
          sender_email?: string | null
          share_class: string
          source_channel?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          extraction_notes?: string | null
          id?: string
          name?: string
          nav_sheet?: string
          portfolio_model_row?: number | null
          sender_email?: string | null
          share_class?: string
          source_channel?: string
        }
        Relationships: []
      }
      gage_screenshots: {
        Row: {
          created_at: string | null
          date_label: string
          description: string
          edited_text: string
          extracted_text: string
          id: string
          image_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_label?: string
          description?: string
          edited_text?: string
          extracted_text?: string
          id?: string
          image_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_label?: string
          description?: string
          edited_text?: string
          extracted_text?: string
          id?: string
          image_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      interaction_tags: {
        Row: {
          created_at: string
          interaction_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          interaction_id: string
          tag: string
        }
        Update: {
          created_at?: string
          interaction_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_tags_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          clean_summary: string | null
          created_at: string
          embedding: string | null
          id: string
          interaction_type:
            | Database["public"]["Enums"]["oig_interaction_type"]
            | null
          occurred_at: string
          org_id: string | null
          primary_person_id: string | null
          priority: Database["public"]["Enums"]["oig_priority"] | null
          raw_text: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["oig_source_type"]
          status: string
          thread_id: string | null
          title: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["oig_priority"] | null
        }
        Insert: {
          clean_summary?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          interaction_type?:
            | Database["public"]["Enums"]["oig_interaction_type"]
            | null
          occurred_at: string
          org_id?: string | null
          primary_person_id?: string | null
          priority?: Database["public"]["Enums"]["oig_priority"] | null
          raw_text?: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["oig_source_type"]
          status?: string
          thread_id?: string | null
          title?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["oig_priority"] | null
        }
        Update: {
          clean_summary?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          interaction_type?:
            | Database["public"]["Enums"]["oig_interaction_type"]
            | null
          occurred_at?: string
          org_id?: string | null
          primary_person_id?: string | null
          priority?: Database["public"]["Enums"]["oig_priority"] | null
          raw_text?: string | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["oig_source_type"]
          status?: string
          thread_id?: string | null
          title?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["oig_priority"] | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_primary_person_id_fkey"
            columns: ["primary_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_log: {
        Row: {
          category: string | null
          chat_history: Json | null
          concept: string
          content: string | null
          context: string | null
          created_at: string
          explanation: string
          id: string
          image_urls: string[] | null
          is_verified: boolean | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          chat_history?: Json | null
          concept: string
          content?: string | null
          context?: string | null
          created_at?: string
          explanation: string
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          chat_history?: Json | null
          concept?: string
          content?: string | null
          context?: string | null
          created_at?: string
          explanation?: string
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          attendees: string | null
          confidence: string | null
          due_date: string | null
          id: string
          ingested_at: string
          meeting_date: string | null
          meeting_title: string | null
          notion_page_id: string | null
          owner: string | null
          promoted_to_priorities: boolean | null
          quote: string | null
          raw_text: string
          source: string
          tactiq_url: string | null
          urgency: string | null
        }
        Insert: {
          attendees?: string | null
          confidence?: string | null
          due_date?: string | null
          id?: string
          ingested_at?: string
          meeting_date?: string | null
          meeting_title?: string | null
          notion_page_id?: string | null
          owner?: string | null
          promoted_to_priorities?: boolean | null
          quote?: string | null
          raw_text: string
          source?: string
          tactiq_url?: string | null
          urgency?: string | null
        }
        Update: {
          attendees?: string | null
          confidence?: string | null
          due_date?: string | null
          id?: string
          ingested_at?: string
          meeting_date?: string | null
          meeting_title?: string | null
          notion_page_id?: string | null
          owner?: string | null
          promoted_to_priorities?: boolean | null
          quote?: string | null
          raw_text?: string
          source?: string
          tactiq_url?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      org_edges: {
        Row: {
          created_at: string | null
          id: string
          source_id: string
          target_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_id: string
          target_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
        ]
      }
      org_groups: {
        Row: {
          color: string | null
          created_at: string | null
          height: number
          id: string
          label: string
          pos_x: number
          pos_y: number
          width: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          height?: number
          id?: string
          label: string
          pos_x?: number
          pos_y?: number
          width?: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          height?: number
          id?: string
          label?: string
          pos_x?: number
          pos_y?: number
          width?: number
        }
        Relationships: []
      }
      org_notion_access: {
        Row: {
          access_level: string | null
          id: string
          notion_page_id: string
          person_id: string
        }
        Insert: {
          access_level?: string | null
          id?: string
          notion_page_id: string
          person_id: string
        }
        Update: {
          access_level?: string | null
          id?: string
          notion_page_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_notion_access_notion_page_id_fkey"
            columns: ["notion_page_id"]
            isOneToOne: false
            referencedRelation: "org_notion_pages"
            referencedColumns: ["notion_page_id"]
          },
          {
            foreignKeyName: "org_notion_access_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
        ]
      }
      org_notion_pages: {
        Row: {
          consolidation_status: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_edited: string | null
          last_edited_by: string | null
          notion_page_id: string
          page_title: string
          page_type: string
          parent_path: string | null
          synced_at: string | null
          teamspace: string | null
        }
        Insert: {
          consolidation_status?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_edited?: string | null
          last_edited_by?: string | null
          notion_page_id: string
          page_title: string
          page_type: string
          parent_path?: string | null
          synced_at?: string | null
          teamspace?: string | null
        }
        Update: {
          consolidation_status?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_edited?: string | null
          last_edited_by?: string | null
          notion_page_id?: string
          page_title?: string
          page_type?: string
          parent_path?: string | null
          synced_at?: string | null
          teamspace?: string | null
        }
        Relationships: []
      }
      org_people: {
        Row: {
          created_at: string | null
          email: string | null
          entity: string | null
          id: string
          job_description: string | null
          location: string | null
          name: string
          parent_id: string | null
          pos_x: number | null
          pos_y: number | null
          responsibilities: string | null
          sort_order: number | null
          status: string
          team: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          entity?: string | null
          id?: string
          job_description?: string | null
          location?: string | null
          name: string
          parent_id?: string | null
          pos_x?: number | null
          pos_y?: number | null
          responsibilities?: string | null
          sort_order?: number | null
          status?: string
          team: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          entity?: string | null
          id?: string
          job_description?: string | null
          location?: string | null
          name?: string
          parent_id?: string | null
          pos_x?: number | null
          pos_y?: number | null
          responsibilities?: string | null
          sort_order?: number | null
          status?: string
          team?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_people_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
        ]
      }
      org_responsibilities: {
        Row: {
          area: string
          category: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          area: string
          category?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          area?: string
          category?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      org_responsibility_assignments: {
        Row: {
          id: string
          person_id: string
          responsibility_id: string
          role: string | null
        }
        Insert: {
          id?: string
          person_id: string
          responsibility_id: string
          role?: string | null
        }
        Update: {
          id?: string
          person_id?: string
          responsibility_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_responsibility_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_responsibility_assignments_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "org_responsibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tech_stack: {
        Row: {
          category: string | null
          id: string
          person_id: string
          tool_name: string
        }
        Insert: {
          category?: string | null
          id?: string
          person_id: string
          tool_name: string
        }
        Update: {
          category?: string | null
          id?: string
          person_id?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_tech_stack_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          org_type: Database["public"]["Enums"]["oig_org_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          org_type?: Database["public"]["Enums"]["oig_org_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          org_type?: Database["public"]["Enums"]["oig_org_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          relationship_type: string | null
          role: string | null
          slack_user_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          relationship_type?: string | null
          role?: string | null
          slack_user_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          relationship_type?: string | null
          role?: string | null
          slack_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          board_state: Json
          id: string
          last_refreshed: string | null
          updated_at: string | null
        }
        Insert: {
          board_state: Json
          id?: string
          last_refreshed?: string | null
          updated_at?: string | null
        }
        Update: {
          board_state?: Json
          id?: string
          last_refreshed?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reconciliation_log: {
        Row: {
          checked_at: string
          dashboard_value: number | null
          fund_name: string
          fund_return_id: string | null
          id: string
          matches: boolean
          portfolio_model_value: number | null
          return_month: string
        }
        Insert: {
          checked_at?: string
          dashboard_value?: number | null
          fund_name: string
          fund_return_id?: string | null
          id?: string
          matches: boolean
          portfolio_model_value?: number | null
          return_month: string
        }
        Update: {
          checked_at?: string
          dashboard_value?: number | null
          fund_name?: string
          fund_return_id?: string | null
          id?: string
          matches?: boolean
          portfolio_model_value?: number | null
          return_month?: string
        }
        Relationships: []
      }
      skill_catalog: {
        Row: {
          amitis_assessment: string | null
          amitis_readiness: string | null
          author: string | null
          category: string | null
          compatibility: string[] | null
          created_at: string | null
          current_version: string | null
          description: string | null
          id: string
          install_status: string | null
          last_synced_at: string | null
          mapped_workflows: string[] | null
          name: string
          skill_md_content: string | null
          source: string | null
          source_url: string | null
          stars: number | null
        }
        Insert: {
          amitis_assessment?: string | null
          amitis_readiness?: string | null
          author?: string | null
          category?: string | null
          compatibility?: string[] | null
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          id?: string
          install_status?: string | null
          last_synced_at?: string | null
          mapped_workflows?: string[] | null
          name: string
          skill_md_content?: string | null
          source?: string | null
          source_url?: string | null
          stars?: number | null
        }
        Update: {
          amitis_assessment?: string | null
          amitis_readiness?: string | null
          author?: string | null
          category?: string | null
          compatibility?: string[] | null
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          id?: string
          install_status?: string | null
          last_synced_at?: string | null
          mapped_workflows?: string[] | null
          name?: string
          skill_md_content?: string | null
          source?: string | null
          source_url?: string | null
          stars?: number | null
        }
        Relationships: []
      }
      skill_evals: {
        Row: {
          baseline_type: string | null
          benchmark_json: Json | null
          created_at: string | null
          duration_ms: number | null
          eval_type: string
          id: string
          iteration: number | null
          notes: string | null
          passed_checks: number | null
          results_json: Json | null
          score: number | null
          skill_id: string | null
          skill_md_snapshot: string | null
          source: string | null
          tokens_used: number | null
          total_checks: number | null
        }
        Insert: {
          baseline_type?: string | null
          benchmark_json?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          eval_type: string
          id?: string
          iteration?: number | null
          notes?: string | null
          passed_checks?: number | null
          results_json?: Json | null
          score?: number | null
          skill_id?: string | null
          skill_md_snapshot?: string | null
          source?: string | null
          tokens_used?: number | null
          total_checks?: number | null
        }
        Update: {
          baseline_type?: string | null
          benchmark_json?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          eval_type?: string
          id?: string
          iteration?: number | null
          notes?: string | null
          passed_checks?: number | null
          results_json?: Json | null
          score?: number | null
          skill_id?: string | null
          skill_md_snapshot?: string | null
          source?: string | null
          tokens_used?: number | null
          total_checks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_evals_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_proposals: {
        Row: {
          business_segment: string | null
          created_at: string | null
          description: string
          draft_skill_md: string | null
          id: string
          notes: string | null
          priority: string | null
          rejection_reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skill_id: string | null
          status: string | null
          submitted_from: string | null
          submitted_skill_md: string | null
          target_workflow: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          business_segment?: string | null
          created_at?: string | null
          description: string
          draft_skill_md?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_id?: string | null
          status?: string | null
          submitted_from?: string | null
          submitted_skill_md?: string | null
          target_workflow?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          business_segment?: string | null
          created_at?: string | null
          description?: string
          draft_skill_md?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_id?: string | null
          status?: string | null
          submitted_from?: string | null
          submitted_skill_md?: string | null
          target_workflow?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_proposals_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_usage: {
        Row: {
          duration_seconds: number | null
          id: string
          notes: string | null
          outcome: string | null
          project: string
          skill_id: string
          trigger_phrase: string | null
          used_at: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          project: string
          skill_id: string
          trigger_phrase?: string | null
          used_at?: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          project?: string
          skill_id?: string
          trigger_phrase?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_usage_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_versions: {
        Row: {
          created_at: string | null
          description: string | null
          eval_score: number | null
          id: string
          promoted_at: string | null
          skill_id: string | null
          skill_md_content: string
          status: string | null
          version_number: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          eval_score?: number | null
          id?: string
          promoted_at?: string | null
          skill_id?: string | null
          skill_md_content: string
          status?: string | null
          version_number: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          eval_score?: number | null
          id?: string
          promoted_at?: string | null
          skill_id?: string | null
          skill_md_content?: string
          status?: string | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_versions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project?: string | null
        }
        Relationships: []
      }
      user_gmail_credentials: {
        Row: {
          created_at: string
          email: string
          last_refreshed_at: string | null
          refresh_token: string
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          last_refreshed_at?: string | null
          refresh_token: string
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          last_refreshed_at?: string | null
          refresh_token?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      skill_usage_summary: {
        Row: {
          failures: number | null
          last_used: string | null
          skill_name: string | null
          skill_project: string | null
          successes: number | null
          total_uses: number | null
          uses_last_30d: number | null
          uses_last_7d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      oig_action_status: "open" | "in_progress" | "blocked" | "done" | "dropped"
      oig_audit_severity: "low" | "medium" | "high" | "critical"
      oig_interaction_type:
        | "email"
        | "thread"
        | "dm"
        | "call"
        | "meeting"
        | "transcript"
        | "note"
      oig_org_type:
        | "customer"
        | "prospect"
        | "investor"
        | "partner"
        | "vendor"
        | "internal"
      oig_priority: "low" | "medium" | "high" | "critical"
      oig_source_type: "gmail" | "slack" | "attio" | "tacd_iq" | "manual"
      user_role: "admin" | "teammate"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      oig_action_status: ["open", "in_progress", "blocked", "done", "dropped"],
      oig_audit_severity: ["low", "medium", "high", "critical"],
      oig_interaction_type: [
        "email",
        "thread",
        "dm",
        "call",
        "meeting",
        "transcript",
        "note",
      ],
      oig_org_type: [
        "customer",
        "prospect",
        "investor",
        "partner",
        "vendor",
        "internal",
      ],
      oig_priority: ["low", "medium", "high", "critical"],
      oig_source_type: ["gmail", "slack", "attio", "tacd_iq", "manual"],
      user_role: ["admin", "teammate"],
    },
  },
} as const

