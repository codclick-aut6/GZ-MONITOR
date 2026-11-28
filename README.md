# v.1.17.1 - CP-Aut9/interface-gallery-desk - 28/11/2026

- Alterada função de disparo do badge "Pediu Atendente":
Agora o badge só é disparado quando
status === 'paused'
assigned_to === null
paused_reason === 'waiting_attendant'

