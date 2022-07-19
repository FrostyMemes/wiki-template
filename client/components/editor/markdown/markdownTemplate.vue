<script>

import { VAppBar, VBtn } from 'vuetify/lib'

export default {
  name: 'markdownTemplate',
  components: {
    VAppBar,
    VBtn
  },

  props: {
    msg: String
  },
  render (createElement) {
    return createElement('v-btn', {}, 'btn');
  }
};
</script>

<style scoped></style>
