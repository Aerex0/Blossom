{{- define "blossom.labels" -}}
app: {{ .Values.labels.app }}
{{- end }}

{{- define "blossom.appLabels" -}}
{{ include "blossom.labels" . }}
component: app
{{- end }}

{{- define "blossom.collabLabels" -}}
{{ include "blossom.labels" . }}
component: collab
{{- end }}

{{- define "blossom.appSelector" -}}
{{ include "blossom.appLabels" . }}
{{- end }}

{{- define "blossom.collabSelector" -}}
{{ include "blossom.collabLabels" . }}
{{- end }}
