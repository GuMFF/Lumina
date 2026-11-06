"use client"

import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import {
  BadgeDollarSign,
  Briefcase,
  Camera,
  Clock3,
  Mail,
  Percent,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
  Wallet,
  X,
} from "lucide-react"

import { formatCurrency, weekdayLabel } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type {
  Appointment,
  CompensationType,
  Profile,
  Service,
  WorkingHours,
} from "@/types"

interface TeamViewProps {
  salonId?: string
  staff: Profile[]
  initialHours: WorkingHours[]
  appointments?: Appointment[]
  services?: Service[]
}

const COMPENSATION_LABELS: Record<CompensationType, string> = {
  COMMISSION: "Por Comissão (%)",
  SALARY: "Assalariado (Fixo)",
  HYBRID: "Salário + Comissão",
}

const WEEKDAYS = [
  { day: 1, label: "Seg" },
  { day: 2, label: "Ter" },
  { day: 3, label: "Qua" },
  { day: 4, label: "Qui" },
  { day: 5, label: "Sex" },
  { day: 6, label: "Sáb" },
  { day: 0, label: "Dom" },
]

export function TeamView({
  salonId = "33c1fa76-592c-4850-b267-df7f18e11fd2",
  staff: initialStaff,
  initialHours,
  appointments = [],
  services = [],
}: TeamViewProps) {
  const [members, setMembers] = useState<Profile[]>(initialStaff)
  const [hours, setHours] = useState<WorkingHours[]>(initialHours)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialStaff[0]?.id
  )
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Estado do formulário de criação de novo funcionário
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "Cabeleireiro(a) & Cortes",
    document: "",
    avatar_url: "",
    compensation_type: "COMMISSION" as CompensationType,
    commission_rate: "50",
    fixed_salary: "2200",
    work_days: [1, 2, 3, 4, 5, 6] as number[],
    start_time: "09:00",
    end_time: "18:00",
    pause_start: "12:00",
    pause_end: "13:00",
  })

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedId) ?? members[0],
    [members, selectedId]
  )

  const selectedHours = useMemo(
    () => hours.filter((item) => item.staff_id === selectedMember?.id),
    [hours, selectedMember?.id]
  )

  // Calcula produção de cortes/serviços e remuneração estimada do funcionário selecionado
  const memberFinancials = useMemo(() => {
    if (!selectedMember) {
      return {
        servicesCount: 0,
        grossRevenue: 0,
        commissionValue: 0,
        fixedSalary: 0,
        totalPayout: 0,
      }
    }

    const memberAppointments = appointments.filter(
      (apt) =>
        apt.staff_id === selectedMember.id && apt.status !== "CANCELLED"
    )

    const grossRevenue = memberAppointments.reduce((acc, apt) => {
      const svc = services.find((s) => s.id === apt.service_id)
      return acc + (svc?.price ?? 0)
    }, 0)

    const compType = selectedMember.compensation_type ?? "COMMISSION"
    const rate = Number(selectedMember.commission_rate ?? 40)
    const salary = Number(selectedMember.fixed_salary ?? 0)

    const commissionValue =
      compType === "COMMISSION" || compType === "HYBRID"
        ? (grossRevenue * rate) / 100
        : 0

    const fixedSalary =
      compType === "SALARY" || compType === "HYBRID" ? salary : 0

    return {
      servicesCount: memberAppointments.length,
      grossRevenue,
      commissionValue,
      fixedSalary,
      totalPayout: fixedSalary + commissionValue,
    }
  }, [appointments, selectedMember, services])

  function handleAvatarFileChange(
    event: ChangeEvent<HTMLInputElement>,
    mode: "create" | "edit"
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (mode === "create") {
        setForm((prev) => ({ ...prev, avatar_url: dataUrl }))
      } else if (selectedMember) {
        updateMemberProfile(selectedMember.id, { avatar_url: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  function toggleWorkDay(day: number) {
    setForm((prev) => {
      const exists = prev.work_days.includes(day)
      const nextDays = exists
        ? prev.work_days.filter((d) => d !== day)
        : [...prev.work_days, day].sort((a, b) => a - b)
      return { ...prev, work_days: nextDays }
    })
  }

  async function handleCreateStaff(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    const compType = form.compensation_type
    const commissionRate =
      compType === "SALARY" ? 0 : Number(form.commission_rate || 0)
    const fixedSalary =
      compType === "COMMISSION" ? 0 : Number(form.fixed_salary || 0)

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salon_id: salonId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          specialty: form.specialty,
          document: form.document || null,
          avatar_url: form.avatar_url || null,
          compensation_type: compType,
          commission_rate: commissionRate,
          fixed_salary: fixedSalary,
          work_days: form.work_days,
          start_time: form.start_time,
          end_time: form.end_time,
          pause_start: form.pause_start || null,
          pause_end: form.pause_end || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFeedback(data.error ?? "Erro ao cadastrar funcionário.")
        setSubmitting(false)
        return
      }

      const createdProfile: Profile = data.profile
      const createdHours: WorkingHours[] = data.workingHours ?? []

      setMembers((prev) => [...prev, createdProfile])
      setHours((prev) => [...prev, ...createdHours])
      setSelectedId(createdProfile.id)
      setShowCreateForm(false)
      setFeedback(`Funcionário "${createdProfile.name}" cadastrado com sucesso!`)
      setForm({
        name: "",
        email: "",
        phone: "",
        specialty: "Cabeleireiro(a) & Cortes",
        document: "",
        avatar_url: "",
        compensation_type: "COMMISSION",
        commission_rate: "50",
        fixed_salary: "2200",
        work_days: [1, 2, 3, 4, 5, 6],
        start_time: "09:00",
        end_time: "18:00",
        pause_start: "12:00",
        pause_end: "13:00",
      })
    } catch {
      setFeedback("Falha ao comunicar com o servidor.")
    } finally {
      setSubmitting(false)
    }
  }

  async function updateMemberProfile(id: string, patch: Partial<Profile>) {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, ...patch } : member))
    )
    await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
  }

  async function handleRemoveMember(id: string, name: string) {
    setMembers((prev) => {
      const remaining = prev.filter((m) => m.id !== id)
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id)
      }
      return remaining
    })
    setHours((prev) => prev.filter((h) => h.staff_id !== id))
    setFeedback(`Funcionário "${name}" removido da equipe.`)
    await fetch(`/api/staff?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  }

  async function updateHour(id: string, patch: Partial<WorkingHours>) {
    setHours((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
    const supabase = createClient()
    await supabase.from("working_hours").update(patch).eq("id", id)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Equipe & Remuneração
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Funcionários, Comissões e Horários
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Cadastre profissionais com foto, dados, modelo de ganho (comissão dos cortes ou salário fixo) e jornada.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-700/20 transition-colors hover:bg-rose-600"
        >
          {showCreateForm ? (
            <>
              <X className="size-4" />
              Fechar Cadastro
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              Novo Funcionário
            </>
          )}
        </button>
      </header>

      {feedback ? (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-amber-700 hover:underline dark:text-amber-300"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {/* Formulário de Criação de Novo Funcionário */}
      {showCreateForm ? (
        <form
          onSubmit={handleCreateStaff}
          className="space-y-5 rounded-3xl border border-rose-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-4 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-rose-700 dark:bg-amber-950/60 dark:text-amber-300">
                <UserPlus className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold">
                  Cadastrar Novo Funcionário
                </h2>
                <p className="text-xs text-stone-500">
                  Preencha o perfil, foto, remuneração dos cortes e expediente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            {/* Coluna da Foto de Perfil */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-950">
                {form.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatar_url}
                    alt="Prévia da foto"
                    className="size-full object-cover"
                  />
                ) : (
                  <Camera className="size-8 text-stone-400" />
                )}
              </div>

              <label className="cursor-pointer rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-center text-xs font-medium text-stone-700 hover:bg-amber-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                Enviar Foto do Computador
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarFileChange(e, "create")}
                  className="hidden"
                />
              </label>

              <input
                type="url"
                value={
                  form.avatar_url.startsWith("data:") ? "" : form.avatar_url
                }
                onChange={(e) =>
                  setForm({ ...form, avatar_url: e.target.value })
                }
                placeholder="Ou cole a URL da foto"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
              />
            </div>

            {/* Dados Pessoais e Profissionais */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1 text-xs font-medium">
                  Nome Completo *
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex.: Lucas Oliveira"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium">
                  E-mail Profissional *
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="lucas@lumina.studio"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium">
                  WhatsApp / Telefone *
                  <input
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="(11) 99999-0000"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium sm:col-span-2">
                  Cargo / Especialidade *
                  <input
                    required
                    value={form.specialty}
                    onChange={(e) =>
                      setForm({ ...form, specialty: e.target.value })
                    }
                    placeholder="Ex.: Barbeiro Sênior, Especialista em Cortes e Mechas"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium">
                  CPF / Documento (opcional)
                  <input
                    value={form.document}
                    onChange={(e) =>
                      setForm({ ...form, document: e.target.value })
                    }
                    placeholder="000.000.000-00"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-rose-600 focus:bg-white focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
                  />
                </label>
              </div>

              {/* Seleção de Modelo de Remuneração dos Cortes */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-stone-800 dark:bg-stone-950">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <BadgeDollarSign className="size-4 text-amber-600" />
                  Modelo de Remuneração dos Cortes / Serviços
                </p>

                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        type: "COMMISSION",
                        title: "Comissionado (%)",
                        desc: "Recebe porcentagem sobre cada corte/serviço feito.",
                      },
                      {
                        type: "SALARY",
                        title: "Assalariado (Fixo)",
                        desc: "Recebe salário mensal fixo independente do volume.",
                      },
                      {
                        type: "HYBRID",
                        title: "Fixo + Comissão",
                        desc: "Salário base garantido + porcentagem por corte.",
                      },
                    ] as Array<{
                      type: CompensationType
                      title: string
                      desc: string
                    }>
                  ).map((option) => {
                    const active = form.compensation_type === option.type
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, compensation_type: option.type })
                        }
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-rose-600 bg-rose-50/80 dark:border-rose-700 dark:bg-rose-950/40"
                            : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                        )}
                      >
                        <p className="text-xs font-semibold">{option.title}</p>
                        <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                          {option.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(form.compensation_type === "COMMISSION" ||
                    form.compensation_type === "HYBRID") && (
                    <label className="grid gap-1 text-xs font-medium">
                      Comissão sobre os cortes (%)
                      <div className="relative">
                        <Percent className="pointer-events-none absolute top-2.5 left-3 size-4 text-amber-600" />
                        <input
                          required
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={form.commission_rate}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              commission_rate: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-3 pl-9 text-sm outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-900"
                        />
                      </div>
                    </label>
                  )}

                  {(form.compensation_type === "SALARY" ||
                    form.compensation_type === "HYBRID") && (
                    <label className="grid gap-1 text-xs font-medium">
                      Salário Fixo Mensal (R$)
                      <div className="relative">
                        <Wallet className="pointer-events-none absolute top-2.5 left-3 size-4 text-rose-600" />
                        <input
                          required
                          type="number"
                          min="0"
                          step="50"
                          value={form.fixed_salary}
                          onChange={(e) =>
                            setForm({ ...form, fixed_salary: e.target.value })
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-3 pl-9 text-sm outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-900"
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Dias e Horários Iniciais */}
              <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium">Dias de Trabalho</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((item) => {
                      const active = form.work_days.includes(item.day)
                      return (
                        <button
                          key={item.day}
                          type="button"
                          onClick={() => toggleWorkDay(item.day)}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "bg-rose-700 text-white"
                              : "border border-stone-200 bg-white text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                          )}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-medium">
                    Início do Expediente
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) =>
                        setForm({ ...form, start_time: e.target.value })
                      }
                      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Fim do Expediente
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) =>
                        setForm({ ...form, end_time: e.target.value })
                      }
                      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                >
                  <Plus className="size-4" />
                  {submitting
                    ? "Cadastrando..."
                    : "Salvar Perfil do Funcionário"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
        {/* Lista lateral de funcionários (Carrossel horizontal no celular/tablet, lista vertical no desktop) */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 lg:flex-col lg:space-y-2.5 lg:overflow-visible lg:pb-0">
          {members.map((member) => {
            const compType = member.compensation_type ?? "COMMISSION"
            const isSelected = selectedMember?.id === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedId(member.id)}
                className={cn(
                  "flex min-w-[235px] shrink-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors lg:w-full lg:min-w-0",
                  isSelected
                    ? "border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/40"
                    : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
                )}
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100/80 text-rose-700 ring-2 ring-amber-200/70 dark:bg-stone-800 dark:text-amber-300 dark:ring-stone-700">
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <UserRound className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{member.name}</p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {member.specialty ?? "Profissional de Beleza"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {compType === "COMMISSION" &&
                        `Comissão ${member.commission_rate ?? 40}%`}
                      {compType === "SALARY" &&
                        `Salário ${formatCurrency(member.fixed_salary ?? 0)}`}
                      {compType === "HYBRID" &&
                        `${formatCurrency(member.fixed_salary ?? 0)} + ${member.commission_rate ?? 30}%`}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Painel de Detalhes do Funcionário Selecionado */}
        {selectedMember ? (
          <div className="space-y-5">
            {/* Card de Perfil, Foto e Remuneração */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-col gap-4 border-b border-stone-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
                <div className="flex items-center gap-4">
                  <label className="group relative flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-amber-100 text-rose-700 ring-2 ring-rose-200 dark:bg-stone-800 dark:text-amber-300">
                    {selectedMember.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedMember.avatar_url}
                        alt={selectedMember.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <UserRound className="size-7" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Trocar
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAvatarFileChange(e, "edit")}
                      className="hidden"
                    />
                  </label>

                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedMember.name}
                    </h2>
                    <p className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                      <Briefcase className="size-3.5 text-amber-600" />
                      {selectedMember.specialty ?? "Profissional de Beleza"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        {selectedMember.email}
                      </span>
                      {selectedMember.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {selectedMember.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {members.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveMember(selectedMember.id, selectedMember.name)
                    }
                    className="inline-flex items-center gap-1.5 self-start rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-800 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="size-3.5" />
                    Remover
                  </button>
                ) : null}
              </div>

              {/* Configuração rápida de Comissão vs Assalariado do funcionário selecionado */}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-400">
                  Regime de Pagamento
                  <select
                    value={selectedMember.compensation_type ?? "COMMISSION"}
                    onChange={(e) =>
                      updateMemberProfile(selectedMember.id, {
                        compensation_type: e.target.value as CompensationType,
                      })
                    }
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  >
                    {Object.entries(COMPENSATION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-400">
                  Comissão nos Cortes (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={
                      (selectedMember.compensation_type ?? "COMMISSION") ===
                      "SALARY"
                    }
                    value={selectedMember.commission_rate ?? 40}
                    onChange={(e) =>
                      updateMemberProfile(selectedMember.id, {
                        commission_rate: Number(e.target.value),
                      })
                    }
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-900 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-400">
                  Salário Fixo Mensal (R$)
                  <input
                    type="number"
                    min="0"
                    step="50"
                    disabled={
                      (selectedMember.compensation_type ?? "COMMISSION") ===
                      "COMMISSION"
                    }
                    value={selectedMember.fixed_salary ?? 0}
                    onChange={(e) =>
                      updateMemberProfile(selectedMember.id, {
                        fixed_salary: Number(e.target.value),
                      })
                    }
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-900 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                </label>
              </div>

              {/* Resumo Financeiro dos Cortes do Profissional */}
              <div className="mt-4 grid gap-3 rounded-2xl bg-amber-50/60 p-3.5 sm:grid-cols-3 dark:bg-stone-950">
                <div>
                  <p className="text-[11px] text-stone-500">
                    Cortes / Serviços na Agenda
                  </p>
                  <p className="text-sm font-semibold">
                    {memberFinancials.servicesCount} atendimento(s) (
                    {formatCurrency(memberFinancials.grossRevenue)})
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-500">
                    Comissão Acumulada
                  </p>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {formatCurrency(memberFinancials.commissionValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-500">
                    Total a Receber (Fixo + Comissão)
                  </p>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(memberFinancials.totalPayout)}
                  </p>
                </div>
              </div>
            </div>

            {/* Grade Semanal de Horários */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="size-4 text-amber-600" />
                Grade semanal de expediente ({selectedMember.name})
              </div>
              <div className="space-y-3">
                {selectedHours.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    Este profissional ainda não possui horários cadastrados.
                  </p>
                ) : (
                  selectedHours.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-950 md:grid-cols-[70px_1fr_1fr]"
                    >
                      <p className="pt-2 font-medium">
                        {weekdayLabel(item.day_of_week)}
                      </p>
                      <label className="grid gap-1 text-xs text-stone-500">
                        Expediente
                        <span className="flex gap-2">
                          <input
                            type="time"
                            value={item.start_time}
                            onChange={(event) =>
                              updateHour(item.id, {
                                start_time: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                          />
                          <input
                            type="time"
                            value={item.end_time}
                            onChange={(event) =>
                              updateHour(item.id, {
                                end_time: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                          />
                        </span>
                      </label>
                      <label className="grid gap-1 text-xs text-stone-500">
                        Pausa
                        <span className="flex gap-2">
                          <input
                            type="time"
                            value={item.pause_start ?? ""}
                            onChange={(event) =>
                              updateHour(item.id, {
                                pause_start: event.target.value || null,
                              })
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                          />
                          <input
                            type="time"
                            value={item.pause_end ?? ""}
                            onChange={(event) =>
                              updateHour(item.id, {
                                pause_end: event.target.value || null,
                              })
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                          />
                        </span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
