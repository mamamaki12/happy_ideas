// 話した文を複数のToDoに分ける
export function splitTasks(text) {
  return text.split(/(?:、|。|それから|あと|\sand\s|,)/).map((s) => s.replace(/^(と|を)\s*/, '').trim()).filter((s) => s.length > 0);
}
