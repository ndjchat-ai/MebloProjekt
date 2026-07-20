package pl.mebloprojekt.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import pl.mebloprojekt.core.BackType
import pl.mebloprojekt.core.CabinetCalculation
import pl.mebloprojekt.core.CabinetCalculator
import pl.mebloprojekt.core.CabinetSpec
import pl.mebloprojekt.core.FrontMount
import pl.mebloprojekt.core.HorizontalAssembly
import pl.mebloprojekt.core.MaterialSpec

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MebloProjektApp()
            }
        }
    }
}

private enum class Screen { PROJECTS, WIZARD, EDITOR, SUMMARY }

private data class SavedProject(
    val name: String,
    val calculation: CabinetCalculation
)

private class AppViewModel : ViewModel() {
    var screen by mutableStateOf(Screen.PROJECTS)
    var currentCalculation by mutableStateOf<CabinetCalculation?>(null)
    val projects = mutableStateListOf<SavedProject>()

    fun create(spec: CabinetSpec) {
        currentCalculation = CabinetCalculator.calculate(spec)
        screen = Screen.EDITOR
    }

    fun saveCurrent() {
        val value = currentCalculation ?: return
        projects.removeAll { it.name == value.spec.name }
        projects += SavedProject(value.spec.name, value)
    }

    fun open(project: SavedProject) {
        currentCalculation = project.calculation
        screen = Screen.EDITOR
    }

    fun updateCompartments(values: List<Int>) {
        val current = currentCalculation ?: return
        currentCalculation = CabinetCalculator.calculate(
            current.spec.copy(customCompartmentHeightsMm = values)
        )
    }
}

@Composable
private fun MebloProjektApp(vm: AppViewModel = viewModel()) {
    when (vm.screen) {
        Screen.PROJECTS -> ProjectsScreen(vm)
        Screen.WIZARD -> WizardScreen(vm)
        Screen.EDITOR -> EditorScreen(vm)
        Screen.SUMMARY -> SummaryScreen(vm)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectsScreen(vm: AppViewModel) {
    Scaffold(
        topBar = { CenterAlignedTopAppBar(title = { Text("MebloProjekt") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { vm.screen = Screen.WIZARD }) {
                Icon(Icons.Default.Add, contentDescription = "Nowy projekt")
            }
        }
    ) { padding ->
        if (vm.projects.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(Icons.Default.Inventory2, null, modifier = Modifier.size(56.dp))
                Spacer(Modifier.height(16.dp))
                Text("Nie masz jeszcze projektów", style = MaterialTheme.typography.titleLarge)
                Text("Utwórz pierwszą szafkę z kreatora.")
                Spacer(Modifier.height(20.dp))
                Button(onClick = { vm.screen = Screen.WIZARD }) {
                    Text("Nowy projekt")
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(vm.projects) { project ->
                    Card(onClick = { vm.open(project) }) {
                        Column(Modifier.fillMaxWidth().padding(16.dp)) {
                            Text(project.name, fontWeight = FontWeight.Bold)
                            Text(
                                "${project.calculation.spec.widthMm} × ${project.calculation.spec.heightMm} × ${project.calculation.spec.depthMm} mm"
                            )
                            Text("${project.calculation.parts.sumOf { it.quantity }} formatek")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WizardScreen(vm: AppViewModel) {
    var name by remember { mutableStateOf("Szafka 1") }
    var width by remember { mutableStateOf("600") }
    var height by remember { mutableStateOf("720") }
    var depth by remember { mutableStateOf("280") }
    var thickness by remember { mutableStateOf("18") }
    var shelves by remember { mutableStateOf("3") }
    var doors by remember { mutableStateOf("2") }
    var assembly by remember { mutableStateOf(HorizontalAssembly.BETWEEN_SIDES) }
    var frontMount by remember { mutableStateOf(FrontMount.OVERLAY) }
    var backType by remember { mutableStateOf(BackType.HDF) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Kreator szafki") },
                navigationIcon = {
                    IconButton(onClick = { vm.screen = Screen.PROJECTS }) {
                        Icon(Icons.Default.ArrowBack, null)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(name, { name = it }, label = { Text("Nazwa") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NumberField("Szer.", width, { width = it }, Modifier.weight(1f))
                NumberField("Wys.", height, { height = it }, Modifier.weight(1f))
                NumberField("Gł.", depth, { depth = it }, Modifier.weight(1f))
            }
            Text("Wymiary dotyczą samego korpusu, bez frontu.", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NumberField("Płyta", thickness, { thickness = it }, Modifier.weight(1f))
                NumberField("Półki", shelves, { shelves = it }, Modifier.weight(1f))
                NumberField("Drzwi", doors, { doors = it }, Modifier.weight(1f))
            }

            ChoiceSection("Góra i dno") {
                ChoiceButton("Między bokami", assembly == HorizontalAssembly.BETWEEN_SIDES) {
                    assembly = HorizontalAssembly.BETWEEN_SIDES
                }
                ChoiceButton("Na zewnątrz boków", assembly == HorizontalAssembly.OUTSIDE_SIDES) {
                    assembly = HorizontalAssembly.OUTSIDE_SIDES
                }
            }
            ChoiceSection("Front") {
                ChoiceButton("Nakładany", frontMount == FrontMount.OVERLAY) { frontMount = FrontMount.OVERLAY }
                ChoiceButton("Wpuszczany", frontMount == FrontMount.INSET) { frontMount = FrontMount.INSET }
            }
            ChoiceSection("Plecy") {
                ChoiceButton("HDF / plecówka", backType == BackType.HDF) { backType = BackType.HDF }
                ChoiceButton("Płyta", backType == BackType.BOARD) { backType = BackType.BOARD }
                ChoiceButton("Bez pleców", backType == BackType.NONE) { backType = BackType.NONE }
            }

            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    val t = thickness.toIntOrNull() ?: 18
                    val board = MaterialSpec("board-main", "Płyta korpusu", t)
                    vm.create(
                        CabinetSpec(
                            name = name.ifBlank { "Szafka" },
                            widthMm = width.toIntOrNull() ?: 600,
                            heightMm = height.toIntOrNull() ?: 720,
                            depthMm = depth.toIntOrNull() ?: 280,
                            boardMaterial = board,
                            frontMaterial = board,
                            shelfCount = shelves.toIntOrNull() ?: 0,
                            doorCount = doors.toIntOrNull() ?: 0,
                            horizontalAssembly = assembly,
                            frontMount = frontMount,
                            backType = backType
                        )
                    )
                }
            ) {
                Text("Utwórz szafkę")
            }
        }
    }
}

@Composable
private fun NumberField(label: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = { new -> onValueChange(new.filter(Char::isDigit)) },
        label = { Text("$label (mm)") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        modifier = modifier
    )
}

@Composable
private fun ChoiceSection(title: String, content: @Composable RowScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(title, fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
private fun ChoiceButton(text: String, selected: Boolean, onClick: () -> Unit) {
    if (selected) {
        Button(onClick = onClick) { Text(text) }
    } else {
        OutlinedButton(onClick = onClick) { Text(text) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditorScreen(vm: AppViewModel) {
    val calculation = vm.currentCalculation ?: return
    var doorsOpen by remember { mutableStateOf(false) }
    var showDimensions by remember { mutableStateOf(true) }
    var editedCompartments by remember(calculation.spec.shelfCount) {
        mutableStateOf(calculation.compartmentHeightsMm.map(Int::toString))
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(calculation.spec.name) },
                navigationIcon = {
                    IconButton(onClick = { vm.screen = Screen.PROJECTS }) {
                        Icon(Icons.Default.ArrowBack, null)
                    }
                },
                actions = {
                    IconButton(onClick = { vm.screen = Screen.SUMMARY }) {
                        Icon(Icons.Default.Inventory2, contentDescription = "Formatki")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Drzwi otwarte")
                Spacer(Modifier.width(8.dp))
                Switch(checked = doorsOpen, onCheckedChange = { doorsOpen = it })
                Spacer(Modifier.weight(1f))
                Text("Wymiary")
                Spacer(Modifier.width(8.dp))
                Switch(checked = showDimensions, onCheckedChange = { showDimensions = it })
            }

            CabinetPreview(calculation, doorsOpen, showDimensions)

            Text(
                "Korpus: ${calculation.spec.widthMm} × ${calculation.spec.heightMm} × ${calculation.spec.depthMm} mm",
                fontWeight = FontWeight.Bold
            )
            Text("Głębokość całkowita z frontem: ${calculation.totalDepthIncludingFrontMm} mm")
            Text("Głębokość półek: ${calculation.shelfDepthMm} mm")

            if (calculation.warnings.isNotEmpty()) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        calculation.warnings.forEach {
                            Row(verticalAlignment = Alignment.Top) {
                                Icon(if (it.isBlocking) Icons.Default.Close else Icons.Default.Visibility, null)
                                Spacer(Modifier.width(8.dp))
                                Text(it.message)
                            }
                        }
                    }
                }
            }

            Text("Wysokości komór", style = MaterialTheme.typography.titleMedium)
            Text("Możesz wpisać nierówne wysokości. Program sprawdzi ich sumę.")
            editedCompartments.forEachIndexed { index, value ->
                OutlinedTextField(
                    value = value,
                    onValueChange = { new ->
                        editedCompartments = editedCompartments.toMutableList().also {
                            it[index] = new.filter(Char::isDigit)
                        }
                    },
                    label = { Text("Komora ${index + 1} (mm)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            OutlinedButton(
                onClick = {
                    vm.updateCompartments(editedCompartments.map { it.toIntOrNull() ?: 0 })
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Check, null)
                Spacer(Modifier.width(8.dp))
                Text("Przelicz półki")
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { vm.saveCurrent() }, modifier = Modifier.weight(1f)) { Text("Zapisz") }
                OutlinedButton(onClick = { vm.screen = Screen.SUMMARY }, modifier = Modifier.weight(1f)) {
                    Text("Formatki")
                }
            }
        }
    }
}

@Composable
private fun CabinetPreview(calculation: CabinetCalculation, doorsOpen: Boolean, showDimensions: Boolean) {
    val spec = calculation.spec
    Card {
        Column(Modifier.padding(12.dp)) {
            Canvas(
                modifier = Modifier.fillMaxWidth().height(360.dp).background(Color(0xFFF7F7F7), RoundedCornerShape(8.dp))
            ) {
                val pad = 34f
                val scale = minOf((size.width - 2 * pad) / spec.widthMm, (size.height - 2 * pad) / spec.heightMm)
                val w = spec.widthMm * scale
                val h = spec.heightMm * scale
                val x = (size.width - w) / 2
                val y = (size.height - h) / 2
                val t = spec.boardMaterial.thicknessMm * scale

                drawRect(Color(0xFFE0C9A6), Offset(x, y), Size(w, h))
                drawRect(Color(0xFFF7F7F7), Offset(x + t, y + t), Size(w - 2 * t, h - 2 * t))
                drawRect(Color.DarkGray, Offset(x, y), Size(w, h), style = Stroke(2f))

                var currentY = y + h - t
                calculation.compartmentHeightsMm.dropLast(1).forEach { opening ->
                    currentY -= opening * scale
                    drawLine(Color(0xFF765B3A), Offset(x + t, currentY), Offset(x + w - t, currentY), strokeWidth = t.coerceAtLeast(4f))
                    currentY -= t
                }

                if (spec.doorCount > 0) {
                    if (!doorsOpen) {
                        val gap = spec.frontClearances.betweenDoorsMm * scale
                        val doorW = (w - gap * (spec.doorCount - 1)) / spec.doorCount
                        repeat(spec.doorCount) { index ->
                            val dx = x + index * (doorW + gap)
                            drawRect(Color(0xFFD6B989), Offset(dx, y), Size(doorW, h))
                            drawRect(Color(0xFF6E5434), Offset(dx, y), Size(doorW, h), style = Stroke(2f))
                        }
                    } else {
                        val leaf = (w / spec.doorCount).coerceAtLeast(18f)
                        drawLine(Color(0xFF6E5434), Offset(x, y), Offset(x - leaf * 0.35f, y + h * 0.15f), 5f)
                        drawLine(Color(0xFF6E5434), Offset(x, y + h), Offset(x - leaf * 0.35f, y + h * 0.85f), 5f)
                        if (spec.doorCount > 1) {
                            drawLine(Color(0xFF6E5434), Offset(x + w, y), Offset(x + w + leaf * 0.35f, y + h * 0.15f), 5f)
                            drawLine(Color(0xFF6E5434), Offset(x + w, y + h), Offset(x + w + leaf * 0.35f, y + h * 0.85f), 5f)
                        }
                    }
                }

                if (showDimensions) {
                    drawLine(Color.Gray, Offset(x, y - 14f), Offset(x + w, y - 14f), 2f)
                    drawLine(Color.Gray, Offset(x - 14f, y), Offset(x - 14f, y + h), 2f)
                }
            }
            if (showDimensions) {
                Text(
                    "Szerokość ${spec.widthMm} mm  •  Wysokość ${spec.heightMm} mm  •  Głębokość korpusu ${spec.depthMm} mm",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SummaryScreen(vm: AppViewModel) {
    val calculation = vm.currentCalculation ?: return
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Formatki") },
                navigationIcon = {
                    IconButton(onClick = { vm.screen = Screen.EDITOR }) {
                        Icon(Icons.Default.ArrowBack, null)
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Text("Wymiary bazowe do zamówienia", style = MaterialTheme.typography.titleLarge)
                Text("Wycięcia wykonywane później nie zmieniają wymiaru formatki.")
            }
            items(calculation.parts) { part ->
                Card {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row {
                            Text(part.name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text("${part.quantity} szt.")
                        }
                        Text("${part.widthMm} × ${part.heightMm} × ${part.thicknessMm} mm")
                        Text(part.material.name)
                        if (part.material.grainMatters) Text("Kierunek dekoru ma znaczenie")
                        if (part.edgeBanding.isNotEmpty()) {
                            Text("Okleina: " + part.edgeBanding.entries.joinToString { "${it.key.name.lowercase()} ${it.value.thicknessMm} mm" })
                        }
                        part.notes.forEach { Text(it, style = MaterialTheme.typography.bodySmall) }
                        part.postProductionCuts.forEach { Text("Obróbka własna: ${it.description}") }
                    }
                }
            }
        }
    }
}
